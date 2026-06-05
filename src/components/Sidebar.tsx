import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import {
  FolderGit2,
  Plus,
  Trash2,
  Settings,
  Check,
  Globe,
} from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.3,
      ease: easeOutExpo,
    },
  }),
  exit: {
    opacity: 0,
    x: -12,
    transition: { duration: 0.2 },
  },
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
  } = useAppStore();

  const { t } = useTranslation();

  return (
    <aside className="w-72 h-full bg-neutral-50/80 border-r border-neutral-100 flex flex-col backdrop-blur-sm">
      {/* Header */}
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
          <button
            onClick={() => i18n.changeLanguage(i18n.language === "zh" ? "en" : "zh")}
            className="ml-auto w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors"
            title={t("settings.language")}
          >
            <Globe className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            {t("sidebar.projects")}
          </span>
          <span className="text-[11px] text-neutral-400">
            {projects.length}
          </span>
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
                      : "hover:bg-white/60 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <motion.button
                      onClick={() =>
                        isSelected
                          ? deselectProject(project.id)
                          : selectProject(project.id)
                      }
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150",
                        isSelected
                          ? "bg-neutral-900 border-neutral-900"
                          : "border-neutral-300 hover:border-neutral-400"
                      )}
                      whileTap={{ scale: 0.85 }}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      )}
                    </motion.button>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">
                        {project.alias}
                      </p>
                      <p className="text-[11px] text-neutral-400 truncate">
                        {project.path}
                      </p>
                    </div>
                    <button
                      onClick={() => removeProject(project.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <motion.div
        className="p-4 border-t border-neutral-100 space-y-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-10 text-sm font-medium"
          onClick={() => {
            const id = `proj-${Date.now()}`;
            addProject({
              id,
              path: `/Users/demo/project-${Math.floor(Math.random() * 100)}`,
            });
          }}
        >
          <Plus className="w-4 h-4" />
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
