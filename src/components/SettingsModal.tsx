import { X, User, Key, Server, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { useAppStore } from "../stores/appStore";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 4,
    transition: { duration: 0.15 },
  },
};

export function SettingsModal() {
  const {
    settingsOpen,
    setSettingsOpen,
    aiConfig,
    setAiConfig,
    userIdentity,
    setUserIdentity,
  } = useAppStore();

  const { t } = useTranslation();

  const providers = [
    { value: "deepseek" as const, label: "DeepSeek" },
    { value: "openai" as const, label: "OpenAI" },
    { value: "claude" as const, label: "Claude" },
    { value: "ollama" as const, label: "Ollama (本地)" },
  ];

  return (
    <AnimatePresence>
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={() => setSettingsOpen(false)}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg mx-4 bg-white rounded-3xl shadow-xl border border-neutral-100 overflow-hidden"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h2 className="text-lg font-semibold text-neutral-900">
                {t("settings.title")}
              </h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* User Identity */}
              <Card className="border-neutral-100 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-neutral-500" />
                    <h3 className="text-sm font-semibold text-neutral-700">
                      {t("settings.userIdentity")}
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {t("settings.userIdentityHint")}
                  </p>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-500">
                        {t("settings.gitUsername")}
                      </label>
                      <input
                        type="text"
                        value={userIdentity.name}
                        onChange={(e) =>
                          setUserIdentity({ name: e.target.value })
                        }
                        placeholder={t("settings.gitUsernamePlaceholder")}
                        className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950/10 transition-shadow"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-500">
                        {t("settings.emails")}
                      </label>
                      <input
                        type="text"
                        value={userIdentity.emails.join(", ")}
                        onChange={(e) =>
                          setUserIdentity({
                            emails: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder={t("settings.emailsPlaceholder")}
                        className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950/10 transition-shadow"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Language */}
              <Card className="border-neutral-100 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-neutral-500" />
                    <h3 className="text-sm font-semibold text-neutral-700">
                      {t("settings.language")}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={i18n.language === "zh" ? "default" : "outline"}
                      onClick={() => i18n.changeLanguage("zh")}
                      className="h-9 px-4 rounded-lg text-sm"
                    >
                      {t("settings.languageZh")}
                    </Button>
                    <Button
                      variant={i18n.language === "en" ? "default" : "outline"}
                      onClick={() => i18n.changeLanguage("en")}
                      className="h-9 px-4 rounded-lg text-sm"
                    >
                      {t("settings.languageEn")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* AI Config */}
              <Card className="border-neutral-100 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Server className="w-4 h-4 text-neutral-500" />
                    <h3 className="text-sm font-semibold text-neutral-700">
                      {t("settings.aiService")}
                    </h3>
                  </div>

                  <div className="space-y-3">
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
                        className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950/10 transition-shadow"
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
                        placeholder="deepseek-chat"
                        className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950/10 transition-shadow"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-500">
                        {t("aiContext.apiBaseUrl")}
                      </label>
                      <input
                        type="text"
                        value={aiConfig.baseUrl}
                        onChange={(e) => setAiConfig({ baseUrl: e.target.value })}
                        placeholder="https://api.deepseek.com/v1"
                        className="w-full h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950/10 transition-shadow"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-neutral-500">
                        {t("aiContext.apiKey")}
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                        <input
                          type="password"
                          value={aiConfig.apiKey}
                          onChange={(e) =>
                            setAiConfig({ apiKey: e.target.value })
                          }
                          placeholder="sk-..."
                          className="w-full h-10 pl-9 pr-3 rounded-xl border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-950/10 transition-shadow"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-neutral-100 bg-neutral-50/50">
              <Button
                onClick={() => setSettingsOpen(false)}
                className="h-10 px-6 rounded-xl text-sm font-medium"
              >
                {t("settings.save")}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
