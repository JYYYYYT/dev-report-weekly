import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { FolderGit2, Plus, Trash2, Settings, Globe, Loader2 } from "lucide-react";
import { chooseRepository, inspectRepository } from "@/lib/bridge";
import { useAppStore } from "@/stores/appStore";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: easeOutExpo },
  }),
  exit: { opacity: 0, x: -12, transition: { duration: 0.2 } },
};

export function Sidebar() {
  const {
    projects,
    selectedProjectIds,
    removeProject,
    selectProject,
    deselectProject,
    setSettingsOpen,
    addProject,
    userIdentity,
    setUserIdentity,
  } = useAppStore();
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const handleAddProject = async () => {
    setIsAdding(true);
    setAddError("");
    try {
      const path = await chooseRepository();
      if (!path) return;
      const inspection = await inspectRepository(path);
      addProject({
        id: crypto.randomUUID(),
        path: inspection.path,
        alias: inspection.alias,
      });
      if (!userIdentity.name && inspection.gitUserName) {
        setUserIdentity({ name: inspection.gitUserName });
      }
      if (!userIdentity.emails.length && inspection.gitUserEmail) {
        setUserIdentity({ emails: [inspection.gitUserEmail] });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setAddError(
        message === "DESKTOP_REQUIRED" ? t("errors.desktopRequired") : message,
      );
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <aside className="w-72 h-full bg-neutral-50/80 border-r border-neutral-100 flex flex-col backdrop-blur-sm">
      <motion.div
        className="p-6 pb-4"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOutExpo }}
      >
        <div className="flex items-center gap-3 mb-1">
          <motion.div
            className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FolderGit2 className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">
              {t("app.name")}
            </h1>
            <p className="text-xs text-neutral-400 font-medium">
              {t("app.tagline")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              i18n.changeLanguage(i18n.language === "zh" ? "en" : "zh")
            }
            className="ml-auto w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-600"
            title={t("settings.language")}
            aria-label={t("settings.language")}
          >
            <Globe className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            {t("sidebar.projects")}
          </span>
          <span className="text-[11px] text-neutral-400">({projects.length})</span>
        </div>
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {projects.map((project, index) => {
              const isSelected = selectedProjectIds.includes(project.id);
              return (
                <motion.div
                  key={project.id}
                  layout
                  custom={index}
                  variants={listItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={cn(
                    "group relative rounded-xl transition-colors duration-200",
                    isSelected
                      ? "bg-white shadow-sm border border-neutral-200/80"
                      : "hover:bg-white/60 border border-transparent",
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        checked
                          ? selectProject(project.id)
                          : deselectProject(project.id)
                      }
                      aria-label={`${t("sidebar.projects")}: ${project.alias}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">
                        {project.alias}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {project.path}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProject(project.id)}
                      className="h-7 w-7 rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100"
                      aria-label={`${t("sidebar.removeProject")} ${project.alias}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        className="p-4 border-t border-neutral-100 space-y-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {addError && <p className="px-2 text-[11px] text-red-500">{addError}</p>}
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-10 text-sm font-medium"
          onClick={handleAddProject}
          disabled={isAdding}
        >
          {isAdding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {t("sidebar.addProject")}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 h-9 text-xs text-neutral-500 hover:text-neutral-700"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="w-4 h-4" />
          {t("sidebar.settings")}
        </Button>
      </motion.div>
    </aside>
  );
}
