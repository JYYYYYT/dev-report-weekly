import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Copy,
  Check,
  RotateCcw,
  Download,
} from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";

export function ReportViewer() {
  const {
    generatedReport,
    setGeneratedReport,
    setCurrentStep,
    generateWeeklyReport,
    isGenerating,
    generationError,
  } = useAppStore();

  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [copiedFeishu, setCopiedFeishu] = useState(false);

  const handleCopy = async (format: "markdown" | "feishu") => {
    let text = generatedReport;
    if (format === "feishu") {
      text = text
        .replace(/^## /gm, "**")
        .replace(/\n/g, "\n\n")
        .replace(/- /g, "• ");
    }
    await navigator.clipboard.writeText(text);
    if (format === "markdown") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedFeishu(true);
      setTimeout(() => setCopiedFeishu(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    await generateWeeklyReport();
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">
              {t("reportViewer.title")}
            </h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              {t("reportViewer.subtitle")}
            </p>
          </div>
        </div>

        <Card className="border-neutral-100 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 bg-neutral-50/50 rounded-t-2xl">
              <span className="text-xs font-medium text-neutral-500">
                {t("reportViewer.editor")}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="h-8 px-3 text-xs gap-1.5 rounded-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t("reportViewer.regenerate")}
                </Button>
              </div>
            </div>
            <Textarea
              value={generatedReport}
              onChange={(e) => setGeneratedReport(e.target.value)}
              className="min-h-[400px] border-0 rounded-none rounded-b-2xl focus-visible:ring-0 resize-none font-mono text-[13px] leading-relaxed"
            />
          </CardContent>
        </Card>

        {/* Rendered Preview */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-neutral-500 mb-3">
            {t("reportViewer.preview")}
          </h3>
          <Card className="border-neutral-100 shadow-sm">
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-neutral-800 prose-p:text-neutral-600 prose-li:text-neutral-600">
                {generatedReport.split("\n").map((line, i) => {
                  if (line.startsWith("## ")) {
                    return (
                      <h2
                        key={i}
                        className="text-lg font-semibold text-neutral-800 mt-6 mb-3 first:mt-0"
                      >
                        {line.replace("## ", "")}
                      </h2>
                    );
                  }
                  if (line.startsWith("### ")) {
                    return (
                      <h3
                        key={i}
                        className="text-base font-semibold text-neutral-700 mt-4 mb-2"
                      >
                        {line.replace("### ", "")}
                      </h3>
                    );
                  }
                  if (line.startsWith("- ")) {
                    return (
                      <li key={i} className="text-sm text-neutral-600 ml-4">
                        {line.replace("- ", "")}
                      </li>
                    );
                  }
                  if (line.trim() === "") {
                    return <div key={i} className="h-2" />;
                  }
                  return (
                    <p key={i} className="text-sm text-neutral-600 leading-relaxed">
                      {line}
                    </p>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {generationError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {generationError}
        </div>
      )}

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(2)}
          className="h-11 px-6 rounded-xl text-sm font-medium"
        >
          {t("reportViewer.back")}
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleCopy("feishu")}
            className="h-11 px-5 rounded-xl text-sm font-medium gap-2"
          >
            {copiedFeishu ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copiedFeishu ? t("reportViewer.copiedFeishu") : t("reportViewer.copyFeishu")}
          </Button>
          <Button
            onClick={() => handleCopy("markdown")}
            className="h-11 px-5 rounded-xl text-sm font-medium gap-2"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {copied ? t("reportViewer.copiedMarkdown") : t("reportViewer.copyMarkdown")}
          </Button>
        </div>
      </div>
    </div>
  );
}
