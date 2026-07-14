import { motion } from "framer-motion";
import { useAppStore } from "@/stores/appStore";
import { useTranslation } from "react-i18next";

export function StepIndicator() {
  const { currentStep } = useAppStore();
  const { t } = useTranslation();

  const steps = [
    { label: t("step.timeRange"), desc: t("step.timeRangeDesc") },
    { label: t("step.summary"), desc: t("step.summaryDesc") },
    { label: t("step.aiContext"), desc: t("step.aiContextDesc") },
    { label: t("step.report"), desc: t("step.reportDesc") },
  ];

  return (
    <div className="flex items-center gap-2 px-1 mb-10">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;

        return (
          <div key={index} className="flex items-center gap-2">
            <motion.div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                isActive
                  ? "bg-neutral-900 text-white shadow-sm"
                  : isCompleted
                  ? "bg-neutral-100 text-neutral-600"
                  : "text-neutral-400"
              }`}
              layout
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <motion.span
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : isCompleted
                    ? "bg-neutral-200 text-neutral-600"
                    : "bg-neutral-100 text-neutral-400"
                }`}
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              >
                {isCompleted ? "✓" : index + 1}
              </motion.span>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold leading-none">
                  {step.label}
                </p>
                <p
                  className={`text-[10px] mt-0.5 ${
                    isActive ? "text-white/60" : "text-neutral-400"
                  }`}
                >
                  {step.desc}
                </p>
              </div>
            </motion.div>
            {index < steps.length - 1 && (
              <div
                className={`w-6 h-px transition-colors duration-300 ${
                  isCompleted ? "bg-neutral-300" : "bg-neutral-100"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
