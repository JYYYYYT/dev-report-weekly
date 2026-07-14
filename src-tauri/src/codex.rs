use crate::report_contract;
use serde::Serialize;
use serde_json::Value;
use std::collections::HashSet;
use std::env;
use std::ffi::{OsStr, OsString};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;
use tempfile::TempDir;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWriteExt};
use tokio::process::Command;
use tokio::sync::{oneshot, Mutex};

const PROBE_TIMEOUT: Duration = Duration::from_secs(8);
const GENERATION_TIMEOUT: Duration = Duration::from_secs(180);
const MAX_PROCESS_OUTPUT_BYTES: usize = 4 * 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CodexStatus {
    available: bool,
    authenticated: bool,
    compatible: bool,
    version: Option<String>,
    message: String,
}

#[derive(Default)]
struct RunControl {
    active: bool,
    cancel_sender: Option<oneshot::Sender<()>>,
}

#[derive(Default)]
pub(crate) struct CodexRunState {
    inner: Mutex<RunControl>,
}

impl CodexRunState {
    async fn begin(&self) -> Result<oneshot::Receiver<()>, String> {
        let mut control = self.inner.lock().await;
        if control.active {
            return Err("CODEX_BUSY".to_string());
        }

        let (sender, receiver) = oneshot::channel();
        control.active = true;
        control.cancel_sender = Some(sender);
        Ok(receiver)
    }

    async fn finish(&self) {
        let mut control = self.inner.lock().await;
        control.active = false;
        control.cancel_sender = None;
    }

    pub(crate) async fn cancel(&self) -> Result<(), String> {
        let mut control = self.inner.lock().await;
        if !control.active {
            return Err("CODEX_NOT_RUNNING".to_string());
        }
        if let Some(sender) = control.cancel_sender.take() {
            let _ = sender.send(());
        }
        Ok(())
    }
}

struct CodexRuntime {
    path: PathBuf,
    version: String,
}

struct ProcessOutput {
    success: bool,
    stdout: String,
    stderr: String,
}

fn allowed_environment_key(key: &OsStr) -> bool {
    let key = key.to_string_lossy();
    matches!(
        key.as_ref(),
        "HOME"
            | "USER"
            | "LOGNAME"
            | "PATH"
            | "SHELL"
            | "TMPDIR"
            | "TMP"
            | "TEMP"
            | "LANG"
            | "CODEX_HOME"
            | "SSL_CERT_FILE"
            | "SSL_CERT_DIR"
            | "HTTP_PROXY"
            | "HTTPS_PROXY"
            | "ALL_PROXY"
            | "NO_PROXY"
            | "http_proxy"
            | "https_proxy"
            | "all_proxy"
            | "no_proxy"
    ) || key.starts_with("LC_")
}

fn apply_safe_environment(command: &mut Command) {
    command.env_clear();
    for (key, value) in env::vars_os() {
        if allowed_environment_key(&key) {
            command.env(key, value);
        }
    }
}

fn push_candidate(candidates: &mut Vec<PathBuf>, seen: &mut HashSet<PathBuf>, path: PathBuf) {
    if path.is_absolute() && seen.insert(path.clone()) {
        candidates.push(path);
    }
}

fn add_versioned_bin_dirs(
    candidates: &mut Vec<PathBuf>,
    seen: &mut HashSet<PathBuf>,
    root: PathBuf,
) {
    let Ok(entries) = std::fs::read_dir(root) else {
        return;
    };
    for entry in entries.flatten() {
        push_candidate(candidates, seen, entry.path().join("bin/codex"));
    }
}

fn codex_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    let mut seen = HashSet::new();

    if let Some(explicit) = env::var_os("CODEX_BIN") {
        push_candidate(&mut candidates, &mut seen, PathBuf::from(explicit));
    }

    if let Some(path) = env::var_os("PATH") {
        for directory in env::split_paths(&path).filter(|path| path.is_absolute()) {
            push_candidate(&mut candidates, &mut seen, directory.join("codex"));
            #[cfg(windows)]
            push_candidate(&mut candidates, &mut seen, directory.join("codex.exe"));
        }
    }

    #[cfg(target_os = "macos")]
    push_candidate(
        &mut candidates,
        &mut seen,
        PathBuf::from("/Applications/Codex.app/Contents/Resources/codex"),
    );

    push_candidate(
        &mut candidates,
        &mut seen,
        PathBuf::from("/opt/homebrew/bin/codex"),
    );
    push_candidate(
        &mut candidates,
        &mut seen,
        PathBuf::from("/usr/local/bin/codex"),
    );

    if let Some(home) = env::var_os("HOME").map(PathBuf::from) {
        for relative in [
            ".local/bin/codex",
            ".bun/bin/codex",
            ".volta/bin/codex",
            ".npm-global/bin/codex",
            "Applications/Codex.app/Contents/Resources/codex",
        ] {
            push_candidate(&mut candidates, &mut seen, home.join(relative));
        }
        add_versioned_bin_dirs(&mut candidates, &mut seen, home.join(".nvm/versions/node"));
        add_versioned_bin_dirs(
            &mut candidates,
            &mut seen,
            home.join(".local/share/fnm/node-versions"),
        );
    }

    candidates
}

async fn command_output(path: &Path, args: &[&str]) -> Result<ProcessOutput, String> {
    let mut command = Command::new(path);
    command.args(args).kill_on_drop(true);
    apply_safe_environment(&mut command);
    let output = tokio::time::timeout(PROBE_TIMEOUT, command.output())
        .await
        .map_err(|_| "CODEX_PROBE_TIMEOUT".to_string())?
        .map_err(|_| "CODEX_START_FAILED".to_string())?;
    Ok(ProcessOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).trim().to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).trim().to_string(),
    })
}

async fn find_runtime() -> Option<CodexRuntime> {
    for path in codex_candidates() {
        let Ok(output) = command_output(&path, &["--version"]).await else {
            continue;
        };
        if output.success {
            let version = if output.stdout.is_empty() {
                output.stderr
            } else {
                output.stdout
            };
            return Some(CodexRuntime { path, version });
        }
    }
    None
}

async fn runtime_status() -> (CodexStatus, Option<CodexRuntime>) {
    let Some(runtime) = find_runtime().await else {
        return (
            CodexStatus {
                available: false,
                authenticated: false,
                compatible: false,
                version: None,
                message: "CODEX_NOT_FOUND".to_string(),
            },
            None,
        );
    };

    let root_help = command_output(&runtime.path, &["--help"]).await;
    let exec_help = command_output(&runtime.path, &["exec", "--help"]).await;
    let compatible = match (root_help, exec_help) {
        (Ok(root), Ok(exec)) if root.success && exec.success => {
            let root_text = format!("{}\n{}", root.stdout, root.stderr);
            let exec_text = format!("{}\n{}", exec.stdout, exec.stderr);
            root_text.contains("--ask-for-approval")
                && [
                    "--json",
                    "--ephemeral",
                    "--sandbox",
                    "--skip-git-repo-check",
                    "--ignore-user-config",
                    "--ignore-rules",
                    "--output-schema",
                    "--color",
                ]
                .iter()
                .all(|flag| exec_text.contains(flag))
                && (exec_text.contains("--cd") || exec_text.contains("-C"))
        }
        _ => false,
    };

    let authenticated = command_output(&runtime.path, &["login", "status"])
        .await
        .map(|output| output.success)
        .unwrap_or(false);
    let message = if !compatible {
        "CODEX_INCOMPATIBLE"
    } else if !authenticated {
        "CODEX_AUTH_REQUIRED"
    } else {
        "CODEX_READY"
    };
    let status = CodexStatus {
        available: true,
        authenticated,
        compatible,
        version: Some(runtime.version.clone()),
        message: message.to_string(),
    };
    (status, Some(runtime))
}

pub(crate) async fn detect() -> CodexStatus {
    runtime_status().await.0
}

fn exec_args(schema_path: &Path, working_directory: &Path) -> Vec<OsString> {
    vec![
        "--ask-for-approval".into(),
        "never".into(),
        "exec".into(),
        "--json".into(),
        "--ephemeral".into(),
        "--sandbox".into(),
        "read-only".into(),
        "--skip-git-repo-check".into(),
        "--ignore-user-config".into(),
        "--ignore-rules".into(),
        "--color".into(),
        "never".into(),
        "--output-schema".into(),
        schema_path.as_os_str().to_owned(),
        "-C".into(),
        working_directory.as_os_str().to_owned(),
    ]
}

async fn read_capped<R>(mut reader: R) -> Result<String, String>
where
    R: AsyncRead + Unpin,
{
    let mut bytes = Vec::new();
    let mut exceeded = false;
    let mut chunk = [0_u8; 8192];
    loop {
        let read = reader
            .read(&mut chunk)
            .await
            .map_err(|_| "CODEX_OUTPUT_READ_FAILED".to_string())?;
        if read == 0 {
            break;
        }
        let remaining = MAX_PROCESS_OUTPUT_BYTES.saturating_sub(bytes.len());
        bytes.extend_from_slice(&chunk[..read.min(remaining)]);
        exceeded |= read > remaining;
    }
    if exceeded {
        return Err("CODEX_OUTPUT_TOO_LARGE".to_string());
    }
    Ok(String::from_utf8_lossy(&bytes).to_string())
}

fn parse_jsonl(stdout: &str) -> Result<String, String> {
    let mut final_message = None;
    let mut turn_completed = false;
    let mut turn_failed = false;

    for line in stdout
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
    {
        let Ok(event) = serde_json::from_str::<Value>(line) else {
            continue;
        };
        match event.get("type").and_then(Value::as_str) {
            Some("item.completed")
                if event.pointer("/item/type").and_then(Value::as_str) == Some("agent_message") =>
            {
                if let Some(text) = event.pointer("/item/text").and_then(Value::as_str) {
                    final_message = Some(text.to_string());
                }
            }
            Some("turn.completed") => turn_completed = true,
            Some("turn.failed") | Some("error") => turn_failed = true,
            _ => {}
        }
    }

    if turn_failed || !turn_completed {
        return Err("CODEX_EXECUTION_FAILED".to_string());
    }
    final_message
        .filter(|message| !message.trim().is_empty())
        .ok_or_else(|| "CODEX_INVALID_RESPONSE".to_string())
}

async fn execute(
    runtime: CodexRuntime,
    prompt: String,
    temp_dir: &TempDir,
    schema_path: &Path,
    mut cancel: oneshot::Receiver<()>,
) -> Result<String, String> {
    let mut command = Command::new(runtime.path);
    command
        .args(exec_args(schema_path, temp_dir.path()))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    apply_safe_environment(&mut command);

    let mut child = command
        .spawn()
        .map_err(|_| "CODEX_START_FAILED".to_string())?;
    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| "CODEX_START_FAILED".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "CODEX_START_FAILED".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "CODEX_START_FAILED".to_string())?;

    let stdout_task = tokio::spawn(read_capped(stdout));
    let stderr_task = tokio::spawn(read_capped(stderr));
    stdin
        .write_all(prompt.as_bytes())
        .await
        .map_err(|_| "CODEX_STDIN_FAILED".to_string())?;
    drop(stdin);

    let started_at = tokio::time::Instant::now();
    let process_success = loop {
        if cancel.try_recv().is_ok() {
            let _ = child.kill().await;
            return Err("CODEX_CANCELED".to_string());
        }
        if started_at.elapsed() >= GENERATION_TIMEOUT {
            let _ = child.kill().await;
            return Err("CODEX_TIMEOUT".to_string());
        }
        if let Some(status) = child
            .try_wait()
            .map_err(|_| "CODEX_EXECUTION_FAILED".to_string())?
        {
            break status.success();
        }
        tokio::time::sleep(Duration::from_millis(50)).await;
    };

    let stdout = stdout_task
        .await
        .map_err(|_| "CODEX_OUTPUT_READ_FAILED".to_string())??;
    let _stderr = stderr_task
        .await
        .map_err(|_| "CODEX_OUTPUT_READ_FAILED".to_string())??;
    if !process_success {
        return Err("CODEX_EXECUTION_FAILED".to_string());
    }
    parse_jsonl(&stdout)
}

pub(crate) async fn generate(prompt: String, state: &CodexRunState) -> Result<String, String> {
    let (status, runtime) = runtime_status().await;
    if !status.available {
        return Err("CODEX_NOT_FOUND".to_string());
    }
    if !status.compatible {
        return Err("CODEX_INCOMPATIBLE".to_string());
    }
    if !status.authenticated {
        return Err("CODEX_AUTH_REQUIRED".to_string());
    }
    let runtime = runtime.ok_or_else(|| "CODEX_NOT_FOUND".to_string())?;
    let cancel = state.begin().await?;

    let result = async {
        let temp_dir = tempfile::tempdir().map_err(|_| "CODEX_TEMP_DIR_FAILED".to_string())?;
        let schema_path = temp_dir.path().join("report-schema.json");
        let schema = serde_json::to_vec(&report_contract::schema())
            .map_err(|_| "CODEX_SCHEMA_FAILED".to_string())?;
        std::fs::write(&schema_path, schema).map_err(|_| "CODEX_SCHEMA_FAILED".to_string())?;
        execute(runtime, prompt, &temp_dir, &schema_path, cancel).await
    }
    .await;

    state.finish().await;
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn secure_flags_are_rooted_and_prompt_is_not_an_argument() {
        let args = exec_args(Path::new("/tmp/schema.json"), Path::new("/tmp/work"));
        let args: Vec<String> = args
            .into_iter()
            .map(|arg| arg.to_string_lossy().to_string())
            .collect();
        assert_eq!(&args[..3], ["--ask-for-approval", "never", "exec"]);
        assert!(args
            .windows(2)
            .any(|pair| pair == ["--sandbox", "read-only"]));
        assert!(args.contains(&"--ephemeral".to_string()));
        assert!(args.contains(&"--ignore-user-config".to_string()));
        assert!(args.contains(&"--ignore-rules".to_string()));
        assert!(!args.iter().any(|arg| arg.contains("Git evidence")));
    }

    #[test]
    fn parses_completed_jsonl_report() {
        let output = concat!(
            "{\"type\":\"item.completed\",\"item\":{\"type\":\"agent_message\",\"text\":\"{\\\"title\\\":\\\"Weekly\\\"}\"}}\n",
            "{\"type\":\"turn.completed\"}\n"
        );
        assert_eq!(parse_jsonl(output).unwrap(), "{\"title\":\"Weekly\"}");
    }

    #[test]
    fn rejects_incomplete_or_failed_jsonl() {
        let incomplete =
            "{\"type\":\"item.completed\",\"item\":{\"type\":\"agent_message\",\"text\":\"{}\"}}";
        assert_eq!(
            parse_jsonl(incomplete).unwrap_err(),
            "CODEX_EXECUTION_FAILED"
        );

        let failed = concat!("{\"type\":\"error\"}\n", "{\"type\":\"turn.completed\"}\n");
        assert_eq!(parse_jsonl(failed).unwrap_err(), "CODEX_EXECUTION_FAILED");
    }
}
