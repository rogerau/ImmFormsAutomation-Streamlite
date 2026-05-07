"use client";

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function WizardProgress({ currentStep, totalSteps, stepLabels }: WizardProgressProps) {
  const pct = Math.round((currentStep / totalSteps) * 100);
  return (
    <div className="mb-8">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Step {currentStep} of {totalSteps}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {stepLabels[currentStep - 1] && (
        <p className="mt-2 text-sm font-medium text-gray-700">{stepLabels[currentStep - 1]}</p>
      )}
    </div>
  );
}
