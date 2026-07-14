import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  CircleCheck,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/stores/appStore";
import type { AIProvider, LocalAgentStatus } from "@/types";

function isReady(status: LocalAgentStatus | null): boolean {
  return Boolean(
    status?.available && status.compatible && status.authenticated,
  );
}

export function LocalAgentsPanel() {
  const {
    aiConfig,
    codexStatus,
    claudeStatus,
    isDetectingCodex,
    isDetectingClaude,
    detectCodex,
    detectClaude,
    selectAiProvider,
  } = useAppStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (!codexStatus && !isDetectingCodex) void detectCodex();
    if (!claudeStatus && !isDetectingClaude) void detectClaude();
  }, [
    claudeStatus,
    codexStatus,
    detectClaude,
    detectCodex,
    isDetectingClaude,
    isDetectingCodex,
  ]);

  const agents: Array<{
    id: Extract<AIProvider, "codex" | "claude">;
    name: string;
    status: LocalAgentStatus | null;
  }> = [
    { id: "codex", name: "Codex", status: codexStatus },
    { id: "claude", name: "Claude Code", status: claudeStatus },
  ];
  const detectedAgents = agents.filter((agent) => agent.status?.available);
  const readyAgents = detectedAgents.filter((agent) => isReady(agent.status));
  const isDetecting = isDetectingCodex || isDetectingClaude;
  const isLoaded = Boolean(codexStatus && claudeStatus);
  const desktopRequired =
    codexStatus?.message === "DESKTOP_REQUIRED" &&
    claudeStatus?.message === "DESKTOP_REQUIRED";
  const descriptionKey = !isLoaded
    ? "localAgents.checking"
    : readyAgents.length
      ? "localAgents.readyDescription"
      : detectedAgents.length
        ? "localAgents.actionDescription"
        : desktopRequired
          ? "localAgents.desktopRequired"
          : "localAgents.notFound";

  const scanAgain = () => {
    void Promise.all([detectCodex(), detectClaude()]);
  };

  return (
    <Card className="border-neutral-100 bg-neutral-50/60 shadow-none">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-neutral-100 bg-white">
              {isDetecting ? (
                <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
              ) : (
                <Bot className="h-4 w-4 text-neutral-600" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-neutral-700">
                {t("localAgents.title")}
              </p>
              <p className="text-xs leading-5 text-neutral-500">
                {t(descriptionKey)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={scanAgain}
            disabled={isDetecting}
            className="shrink-0 gap-1.5 text-neutral-500"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("localAgents.refresh")}
          </Button>
        </div>

        {detectedAgents.map((agent) => {
          const ready = isReady(agent.status);
          const selected = aiConfig.provider === agent.id;
          const detail = agent.status?.message.endsWith("_INCOMPATIBLE")
            ? t("localAgents.updateRequired")
            : agent.status?.message.endsWith("_AUTH_REQUIRED")
              ? t("localAgents.signInRequired")
              : null;
          return (
            <div
              key={agent.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-white p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                  <Terminal className="h-4 w-4 text-neutral-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-neutral-700">
                      {agent.name}
                    </p>
                    <Badge variant={ready ? "success" : "warning"}>
                      {ready
                        ? t("localAgents.available")
                        : t("localAgents.actionRequired")}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-neutral-400">
                    {[agent.status?.version, detail].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              {ready && (
                <Button
                  type="button"
                  variant={selected ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => selectAiProvider(agent.id)}
                  disabled={selected}
                  className="shrink-0 gap-1.5"
                >
                  {selected && <CircleCheck className="h-3.5 w-3.5" />}
                  {selected
                    ? t("localAgents.selected")
                    : t("localAgents.useAgent", { agent: agent.name })}
                </Button>
              )}
            </div>
          );
        })}

        {readyAgents.length > 0 && (
          <div className="flex items-start gap-2 border-t border-neutral-100 pt-3 text-[11px] leading-4 text-neutral-400">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>{t("localAgents.credentialsHint")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
