import { useState } from 'react';
import {
  FolderOpen,
  Highlighter,
  Sparkles,
  Pin,
  ArrowRight,
  X,
} from 'lucide-react';

const ONBOARDING_KEY = 'onboarding-completed';

const steps = [
  {
    icon: FolderOpen,
    iconBg: 'from-blue-500/10 to-indigo-500/10',
    iconColor: 'text-blue-500',
    title: 'Open a Folder',
    description:
      'Start by selecting a folder from the sidebar. All your PDF papers in that folder will appear in a clean file list.',
  },
  {
    icon: Pin,
    iconBg: 'from-amber-500/10 to-orange-500/10',
    iconColor: 'text-amber-500',
    title: 'Pin Your Folder',
    description:
      'Click the pin icon to save your folder. Next time you open the app, it will load automatically — no need to navigate again.',
  },
  {
    icon: Highlighter,
    iconBg: 'from-green-500/10 to-emerald-500/10',
    iconColor: 'text-green-500',
    title: 'Highlight Text',
    description:
      'Select any text in a paper and choose a color to highlight it. Your highlights are saved and will be there next time you open the paper.',
  },
  {
    icon: Sparkles,
    iconBg: 'from-accent/10 to-teal/10',
    iconColor: 'text-accent',
    title: 'Ask AI Anything',
    description:
      'Select text and click "Ask AI" for an instant explanation. Or open the chat panel to ask questions about the entire paper.',
  },
];

export function OnboardingModal() {
  const [isVisible, setIsVisible] = useState(
    !localStorage.getItem(ONBOARDING_KEY)
  );
  const [currentStep, setCurrentStep] = useState(0);

  if (!isVisible) return null;

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsVisible(false);
  };

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === currentStep
                    ? 'w-6 bg-accent'
                    : i < currentStep
                      ? 'w-3 bg-accent/30'
                      : 'w-3 bg-gray-200'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleComplete}
            className="p-1 text-gray-300 hover:text-gray-500 cursor-pointer rounded-lg hover:bg-gray-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 text-center">
          <div
            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.iconBg} flex items-center justify-center mx-auto mb-5`}
          >
            <Icon size={28} className={step.iconColor} />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">{step.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
            {step.description}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center justify-between">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 cursor-pointer rounded-lg"
            >
              Back
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-600 cursor-pointer rounded-lg"
            >
              Skip
            </button>
          )}
          <button
            onClick={isLast ? handleComplete : () => setCurrentStep((s) => s + 1)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/20 cursor-pointer transition-shadow"
          >
            {isLast ? 'Get Started' : 'Next'}
            {!isLast && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
