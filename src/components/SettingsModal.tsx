import { User, Key, Server, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useAppStore } from "@/stores/appStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AIProvider } from "@/types";

const providers: { value: AIProvider; label: string }[] = [
  { value: "deepseek", label: "DeepSeek" },
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama (本地)" },
  { value: "custom", label: "OpenAI-compatible" },
];

export function SettingsModal() {
  const {
    settingsOpen,
    setSettingsOpen,
    aiConfig,
    setAiConfig,
    selectAiProvider,
    userIdentity,
    setUserIdentity,
  } = useAppStore();
  const { t } = useTranslation();

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent
        className="mx-4"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="px-6 py-5 border-b border-neutral-100">
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("settings.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
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
                  <Label htmlFor="git-username">
                    {t("settings.gitUsername")}
                  </Label>
                  <Input
                    id="git-username"
                    value={userIdentity.name}
                    onChange={(event) =>
                      setUserIdentity({ name: event.target.value })
                    }
                    placeholder={t("settings.gitUsernamePlaceholder")}
                    className="h-10 px-3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="git-emails">{t("settings.emails")}</Label>
                  <Input
                    id="git-emails"
                    value={userIdentity.emails.join(", ")}
                    onChange={(event) =>
                      setUserIdentity({
                        emails: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder={t("settings.emailsPlaceholder")}
                    className="h-10 px-3"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

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
                  <Label htmlFor="settings-provider">
                    {t("aiContext.provider")}
                  </Label>
                  <Select
                    value={aiConfig.provider}
                    onValueChange={(value) =>
                      selectAiProvider(value as AIProvider)
                    }
                  >
                    <SelectTrigger id="settings-provider">
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
                  <Label htmlFor="settings-model">{t("aiContext.model")}</Label>
                  <Input
                    id="settings-model"
                    value={aiConfig.model}
                    onChange={(event) => setAiConfig({ model: event.target.value })}
                    placeholder="deepseek-chat"
                    className="h-10 px-3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-base-url">
                    {t("aiContext.apiBaseUrl")}
                  </Label>
                  <Input
                    id="settings-base-url"
                    value={aiConfig.baseUrl}
                    onChange={(event) =>
                      setAiConfig({ baseUrl: event.target.value })
                    }
                    placeholder="https://api.deepseek.com/v1"
                    className="h-10 px-3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-api-key">
                    {t("aiContext.apiKey")}
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <Input
                      id="settings-api-key"
                      type="password"
                      value={aiConfig.apiKey}
                      onChange={(event) =>
                        setAiConfig({ apiKey: event.target.value })
                      }
                      placeholder="sk-..."
                      className="h-10 pl-9 pr-3"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {t("aiContext.apiKeyHint")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50">
          <Button
            onClick={() => setSettingsOpen(false)}
            className="h-10 px-6 rounded-xl text-sm font-medium"
          >
            {t("settings.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
