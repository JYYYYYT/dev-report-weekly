import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { cn } from "../lib/utils";
import type { TimeRange } from "../types";

const presets: { value: TimeRange; labelKey: string }[] = [
  { value: "this-week", labelKey: "timeRange.thisWeek" },
  { value: "last-week", labelKey: "timeRange.lastWeek" },
  { value: "last-7-days", labelKey: "timeRange.last7Days" },
  { value: "last-30-days", labelKey: "timeRange.last30Days" },
];

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function TimeRangeSelector() {
  const {
    timeRange,
    setTimeRange,
    setCurrentStep,
    scanSelectedProjects,
    isScanning,
    scanError,
  } = useAppStore();
  const { t } = useTranslation();

  const handleNext = async () => {
    if (await scanSelectedProjects()) setCurrentStep(1);
  };

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
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">
              {t("timeRange.title")}
            </h2>
            <p className="text-sm text-neutral-400 mt-0.5">
              {t("timeRange.subtitle")}
            </p>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-3">
          {presets.map((preset) => (
            <Button
              key={preset.value}
              variant={
                timeRange.type === preset.value ? "default" : "outline"
              }
              onClick={() => setTimeRange({ type: preset.value })}
              className={cn(
                "rounded-xl h-11 px-6 text-sm font-medium transition-transform duration-75 active:scale-[0.97]",
                timeRange.type === preset.value
                  ? "shadow-sm"
                  : "hover:bg-neutral-50"
              )}
            >
              {t(preset.labelKey)}
            </Button>
          ))}
          <Button
            variant={timeRange.type === "custom" ? "default" : "outline"}
            onClick={() => setTimeRange({ type: "custom" })}
            className={cn(
              "rounded-xl h-11 px-6 text-sm font-medium transition-transform duration-75 gap-2 active:scale-[0.97]",
              timeRange.type === "custom"
                ? "shadow-sm"
                : "hover:bg-neutral-50"
            )}
          >
            <Calendar className="w-4 h-4" />
            {t("timeRange.custom")}
          </Button>
        </div>

        <AnimatePresence>
          {timeRange.type === "custom" && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 16 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{
                height: { duration: 0.3, ease: easeOutExpo },
                opacity: { duration: 0.2 },
                marginTop: { duration: 0.3 },
              }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-neutral-100 shadow-sm">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="start-date">
                    {t("timeRange.startDate")}
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={timeRange.start || ""}
                    onChange={(e) =>
                      setTimeRange({
                        ...timeRange,
                        start: e.target.value,
                      })
                    }
                    className="h-10 px-3"
                  />
                </div>
                <div className="text-neutral-300 pt-5">
                  <span className="text-lg">→</span>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="end-date">
                    {t("timeRange.endDate")}
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={timeRange.end || ""}
                    onChange={(e) =>
                      setTimeRange({
                        ...timeRange,
                        end: e.target.value,
                      })
                    }
                    className="h-10 px-3"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {scanError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {scanError}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={isScanning}
          className="h-11 px-8 rounded-xl text-sm font-medium gap-2"
        >
          {isScanning && <Loader2 className="w-4 h-4 animate-spin" />}
          {isScanning ? t("timeRange.scanning") : t("timeRange.next")}
        </Button>
      </div>
    </div>
  );
}
