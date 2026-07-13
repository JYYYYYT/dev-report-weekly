import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  Sparkles,
  FileText,
  Clock,
  FolderGit2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { buildEvidence, renderEvidenceContext } from "@/lib/report";
import { useAppStore } from "@/stores/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AIProvider } from "@/types";

const providers: { value: AIProvider; label: string }[] = [
  { value: "deepseek", label: "DeepSeek" },
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama (本地)" },
  { value: "custom", label: "OpenAI-compatible" },
];

const timeRangeKeys: Record<string, string> = {
  "this-week": "timeRange.thisWeek",
  "last-week": "timeRange.lastWeek",
  "last-7-days": "timeRange.last7Days",
  "last-30-days": "timeRange.last30Days",
  custom: "timeRange.custom",
};

export function AIContextEditor() {
  const {
    projects,
    selectedProjectIds,
    summaries,
    excludedCommitHashes,
    timeRange,
    aiConfig,
    selectAiProvider,
    setAiConfig,
    aiContext,
    setAiContext,
    setCurrentStep,
    generateWeeklyReport,
    generationError,
    isGenerating,
  } = useAppStore();
  const { t, i18n } = useTranslation();
  const selectedProjects = projects.filter((project) =>
    selectedProjectIds.includes(project.id),
  );
  const evidence = useMemo(
    () => buildEvidence(summaries, excludedCommitHashes),
    [summaries, excludedCommitHashes],
  );
  const evidenceContext = useMemo(
    () => renderEvidenceContext(evidence, i18n.language === "zh" ? "zh" : "en"),
    [evidence, i18n.language],
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">
              {t("aiContext.title")}
            </h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              {t("aiContext.subtitle")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-neutral-100 text-sm text-neutral-600">
            <Clock className="w-4 h-4 text-neutral-400" />
            <span>{t(timeRangeKeys[timeRange.type])}</span>
            {timeRange.type === "custom" && timeRange.start && (
              <span className="text-neutral-400">
                {timeRange.start} ~ {timeRange.end}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-neutral-100 text-sm text-neutral-600">
            <FolderGit2 className="w-4 h-4 text-neutral-400" />
            <span>
              {selectedProjects.length} {t("aiContext.projects")}
            </span>
          </div>
          {selectedProjects.map((project) => (
            <Badge key={project.id} variant="secondary">
              {project.alias}
            </Badge>
          ))}
        </div>

        <Card className="mb-6 border-neutral-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-500" />
                <h3 className="text-sm font-semibold text-neutral-700">
                  {t("aiContext.commitSummary")}
                </h3>
              </div>
              <Badge variant="secondary">
                {evidence.length} {t("aiContext.evidenceItems")}
              </Badge>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4 font-mono text-[13px] leading-relaxed text-neutral-600 whitespace-pre-wrap max-h-80 overflow-y-auto">
              {evidenceContext}
            </div>
            <div className="flex items-start gap-2 mt-4 text-xs text-neutral-400">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
              <span>{t("aiContext.privacyHint")}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 mb-6">
          <Label htmlFor="extra-context" className="text-sm font-semibold text-neutral-700">
            {t("aiContext.extraContext")}
          </Label>
          <p className="text-xs text-neutral-400">
            {t("aiContext.extraContextHint")}
          </p>
          <Textarea
            id="extra-context"
            value={aiContext}
            onChange={(event) => setAiContext(event.target.value)}
            placeholder={t("aiContext.extraContextPlaceholder")}
            className="min-h-[140px] text-sm"
          />
        </div>

        <Card className="border-neutral-100 shadow-sm">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-700">
                {t("aiContext.aiConfig")}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ai-provider">{t("aiContext.provider")}</Label>
                <Select
                  value={aiConfig.provider}
                  onValueChange={(value) => selectAiProvider(value as AIProvider)}
                >
                  <SelectTrigger id="ai-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-model">{t("aiContext.model")}</Label>
                <Input
                  id="ai-model"
                  value={aiConfig.model}
                  onChange={(event) => setAiConfig({ model: event.target.value })}
                  className="h-10 px-3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-base-url">{t("aiContext.apiBaseUrl")}</Label>
              <Input
                id="ai-base-url"
                value={aiConfig.baseUrl}
                onChange={(event) => setAiConfig({ baseUrl: event.target.value })}
                className="h-10 px-3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-api-key">{t("aiContext.apiKey")}</Label>
              <Input
                id="ai-api-key"
                type="password"
                value={aiConfig.apiKey}
                onChange={(event) => setAiConfig({ apiKey: event.target.value })}
                placeholder="sk-..."
                className="h-10 px-3"
              />
              <p className="text-[11px] text-neutral-400">
                {t("aiContext.apiKeyHint")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {generationError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {generationError}
        </div>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(1)}
          className="h-11 px-6 rounded-xl text-sm font-medium"
        >
          {t("aiContext.prev")}
        </Button>
        <Button
          onClick={() => generateWeeklyReport()}
          disabled={isGenerating || !evidence.length}
          className="h-11 px-8 rounded-xl text-sm font-medium gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("aiContext.generating")}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {t("aiContext.generate")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
