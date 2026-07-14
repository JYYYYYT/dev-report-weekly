import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "./stores/appStore";
import { Sidebar } from "./components/Sidebar";
import { TimeRangeSelector } from "./components/TimeRangeSelector";
import { ProjectSummary } from "./components/ProjectSummary";
import { AIContextEditor } from "./components/AIContextEditor";
import { ReportViewer } from "./components/ReportViewer";
import { SettingsModal } from "./components/SettingsModal";
import { StepIndicator } from "./components/StepIndicator";


const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

const stepVariants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: easeOutExpo,
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2 },
  },
};

function App() {
  const { currentStep } = useAppStore();

  return (
    <div className="h-screen w-screen bg-neutral-50 flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-12">
            <StepIndicator />

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {currentStep === 0 && <TimeRangeSelector />}
                {currentStep === 1 && <ProjectSummary />}
                {currentStep === 2 && <AIContextEditor />}
                {currentStep === 3 && <ReportViewer />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      <SettingsModal />
    </div>
  );
}

export default App;
