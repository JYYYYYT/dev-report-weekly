import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  GitCommit,
  FileCode,
  ArrowUp,
  ArrowDown,
  ChevronDown,
} from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: easeOutExpo },
  }),
};

const commitItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: easeOutExpo },
  }),
  exit: { opacity: 0, x: 8, transition: { duration: 0.2 } },
};

export function ProjectSummary() {
  const {
    projects,
    selectedProjectIds,
    summaries,
    excludedCommitHashes,
    toggleCommit,
    setCurrentStep,
  } = useAppStore();
  const { t, i18n } = useTranslation();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(selectedProjectIds),
  );

  const toggleExpand = (id: string) => {
    setExpandedProjects((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedProjects = projects.filter((project) =>
    selectedProjectIds.includes(project.id),
  );
  const hasIncludedCommit = summaries.some((summary) =>
    summary.commits.some(
      (commit) => !excludedCommitHashes.includes(commit.hash),
    ),
  );

  return (
    <div className="space-y-8">
      <div>
        <motion.div
          className="flex items-center gap-3 mb-6"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOutExpo }}
        >
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 flex items-center justify-center">
            <GitCommit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">
              {t("projectSummary.title")}
            </h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              {t("projectSummary.subtitle")}
            </p>
          </div>
        </motion.div>

        <div className="space-y-4">
          {selectedProjects.map((project, projectIndex) => {
            const summary = summaries.find(
              (item) => item.projectId === project.id,
            );
            const commits = summary?.commits ?? [];
            const isExpanded = expandedProjects.has(project.id);
            const includedCount = commits.filter(
              (commit) => !excludedCommitHashes.includes(commit.hash),
            ).length;

            return (
              <motion.div
                key={project.id}
                custom={projectIndex}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Card className="overflow-hidden border-neutral-100 shadow-sm">
                  <CardHeader className="p-5">
                    <div
                      className="flex items-center justify-between cursor-pointer group"
                      onClick={() => toggleExpand(project.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-7 h-7 rounded-lg"
                          aria-label={t("projectSummary.toggleProject")}
                        >
                          <motion.span
                            animate={{ rotate: isExpanded ? 0 : -90 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4 text-neutral-500" />
                          </motion.span>
                        </Button>
                        <div>
                          <h3 className="text-base font-semibold text-neutral-800">
                            {project.alias}
                          </h3>
                          <p className="text-xs text-neutral-400">{project.path}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                          <FileCode className="w-3.5 h-3.5" />
                          <span>
                            {commits.length} {t("projectSummary.commits")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 font-medium">
                            +{summary?.totalAdditions ?? 0}
                          </span>
                          <ArrowDown className="w-3.5 h-3.5 text-red-400 ml-1" />
                          <span className="text-red-500 font-medium">
                            -{summary?.totalDeletions ?? 0}
                          </span>
                        </div>
                        {includedCount < commits.length && (
                          <Badge variant="warning">
                            {includedCount}/{commits.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          height: { duration: 0.3, ease: easeOutExpo },
                          opacity: { duration: 0.2 },
                        }}
                        className="overflow-hidden"
                      >
                        <CardContent className="p-5 pt-0 space-y-3">
                          {!commits.length && (
                            <span className="text-[11px] text-neutral-400 pl-4">
                              {t("projectSummary.noCommits")}
                            </span>
                          )}
                          <AnimatePresence>
                            {commits.map((commit, commitIndex) => {
                              const isExcluded = excludedCommitHashes.includes(
                                commit.hash,
                              );
                              return (
                                <motion.div
                                  key={commit.hash}
                                  custom={commitIndex}
                                  variants={commitItemVariants}
                                  initial="hidden"
                                  animate="visible"
                                  exit="exit"
                                  layout
                                  className={cn(
                                    "group rounded-xl border p-4 transition-colors duration-200",
                                    isExcluded
                                      ? "border-neutral-100 bg-neutral-50/50 opacity-50"
                                      : "border-neutral-100 bg-white hover:border-neutral-200 hover:shadow-sm",
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    <Checkbox
                                      checked={!isExcluded}
                                      onCheckedChange={() => toggleCommit(commit.hash)}
                                      className="mt-0.5"
                                      aria-label={commit.subject}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <code className="text-[11px] font-mono text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                                          {commit.shortHash}
                                        </code>
                                        <span className="text-[11px] text-neutral-400">
                                          {new Date(commit.date).toLocaleDateString(
                                            i18n.language === "zh" ? "zh-CN" : "en-US",
                                          )}
                                        </span>
                                      </div>
                                      <p
                                        className={cn(
                                          "text-sm font-medium leading-relaxed",
                                          isExcluded
                                            ? "text-neutral-400 line-through"
                                            : "text-neutral-800",
                                        )}
                                      >
                                        {commit.subject}
                                      </p>
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        {commit.filesChanged.map((file) => (
                                          <motion.span
                                            key={file}
                                            className="text-[11px] text-neutral-500 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-100"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.2 }}
                                          >
                                            {file.split("/").pop()}
                                          </motion.span>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-400">
                                        <span className="flex items-center gap-1">
                                          <ArrowUp className="w-3 h-3 text-emerald-500" />
                                          {commit.additions}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <ArrowDown className="w-3 h-3 text-red-400" />
                                          {commit.deletions}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(0)}
          className="h-11 px-6 rounded-xl text-sm font-medium"
        >
          {t("projectSummary.prev")}
        </Button>
        <Button
          onClick={() => setCurrentStep(2)}
          disabled={!hasIncludedCommit}
          className="h-11 px-8 rounded-xl text-sm font-medium"
        >
          {t("projectSummary.next")}
        </Button>
      </div>
    </div>
  );
}
