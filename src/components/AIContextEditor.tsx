import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  Sparkles,
  FileText,
  Clock,
  FolderGit2,
  Loader2,
} from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";

const timeRangeLabels: Record<string, string> = {
  "this-week": "本周",
  "last-week": "上周",
  "last-7-days": "近 7 天",
  "last-30-days": "近 30 天",
  custom: "自定义",
};

const demoContext = `【frontend】
• feat: 重构登录页表单校验逻辑 (a1b2c3d)
  文件: Form.tsx, validator.ts, useAuth.ts
  +128 / -45

• fix: 修复 Dashboard 图表在暗色模式下显示异常 (b2c3d4e)
  文件: Chart.tsx, theme.css
  +34 / -12

• perf: 优化首页图片懒加载策略 (c3d4e5f)
  文件: LazyImage.tsx, index.tsx
  +67 / -23

【backend-api】
• feat: 新增用户权限中间件 (d4e5f67)
  文件: auth.ts, user.ts, Role.ts
  +210 / -18

• fix: 修复订单查询 SQL 慢查询问题 (e5f6789)
  文件: OrderService.ts, add_index.sql
  +56 / -8`;

const demoReport = `## 本周工作总结

### frontend
本周主要完成了登录模块的重构工作，对表单校验逻辑进行了全面优化，提升了用户体验和代码可维护性。同时修复了 Dashboard 图表在暗色模式下的显示异常，确保多端视觉一致性。此外，对首页图片加载策略进行了性能优化，采用更精细的懒加载机制，预计可提升首屏加载速度约 15%。

### backend-api
完成了用户权限中间件的开发，为后续 RBAC 权限体系的落地奠定了基础。针对订单查询接口存在的慢查询问题，通过添加复合索引进行优化，查询耗时从原来的 2.3s 降低至 120ms 以内。

### 问题与风险
- 登录重构涉及多处表单交互，需重点回归测试
- 权限中间件目前仅覆盖基础路由，复杂场景待补充

### 下周计划
- 完善权限中间件的异常处理与日志记录
- 推进前端组件库的统一升级
- 配合 QA 完成登录模块的回归测试`;

export function AIContextEditor() {
  const {
    projects,
    selectedProjectIds,
    timeRange,
    aiConfig,
    setAiConfig,
    setCurrentStep,
    setGeneratedReport,
    setIsGenerating,
    isGenerating,
  } = useAppStore();

  const { t } = useTranslation();
  const [extraContext, setExtraContext] = useState("");
  const selectedProjects = projects.filter((p) =>
    selectedProjectIds.includes(p.id)
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setGeneratedReport(demoReport);
    setIsGenerating(false);
    setCurrentStep(3);
  };

  const providers = [
    { value: "deepseek" as const, label: "DeepSeek" },
    { value: "openai" as const, label: "OpenAI" },
    { value: "claude" as const, label: "Claude" },
    { value: "ollama" as const, label: "Ollama (本地)" },
  ];

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

        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-neutral-100 text-sm text-neutral-600">
            <Clock className="w-4 h-4 text-neutral-400" />
            <span>{timeRangeLabels[timeRange.type]}</span>
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
          {selectedProjects.map((p) => (
            <Badge key={p.id} variant="secondary">
              {p.alias}
            </Badge>
          ))}
        </div>

        {/* Commit Context */}
        <Card className="mb-6 border-neutral-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-700">
                {t("aiContext.commitSummary")}
              </h3>
            </div>
            <div className="bg-neutral-50 rounded-xl p-4 font-mono text-[13px] leading-relaxed text-neutral-600 whitespace-pre-wrap">
              {demoContext}
            </div>
          </CardContent>
        </Card>

        {/* Extra Context */}
        <div className="space-y-3 mb-6">
          <label className="text-sm font-semibold text-neutral-700">
            {t("aiContext.extraContext")}
          </label>
          <p className="text-xs text-neutral-400">
            {t("aiContext.extraContextHint")}
          </p>
          <Textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder={`例如：
• 周三参加了技术方案评审会，确定了微服务拆分方案
• 完成了《API 设计规范》文档的编写
• 完成了 5 个 PR 的 Code Review`}
            className="min-h-[140px] text-sm"
          />
        </div>

        {/* AI Config */}
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
                <label className="text-xs font-medium text-neutral-500">
                  {t("aiContext.provider")}
                </label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) =>
                    setAiConfig({
                      provider: e.target.value as typeof aiConfig.provider,
                    })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950/10"
                >
                  {providers.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-neutral-500">
                  {t("aiContext.model")}
                </label>
                <input
                  type="text"
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ model: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-500">
                {t("aiContext.apiBaseUrl")}
              </label>
              <input
                type="text"
                value={aiConfig.baseUrl}
                onChange={(e) => setAiConfig({ baseUrl: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-500">
                {t("aiContext.apiKey")}
              </label>
              <input
                type="password"
                value={aiConfig.apiKey}
                onChange={(e) => setAiConfig({ apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950/10"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(1)}
          className="h-11 px-6 rounded-xl text-sm font-medium"
        >
          {t("aiContext.prev")}
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
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
