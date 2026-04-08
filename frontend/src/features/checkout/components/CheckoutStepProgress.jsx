export default function CheckoutStepProgress({ steps, step }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {steps.map((label, index) => {
        const currentStep = index + 1
        const isDone = currentStep < step
        const isCurrent = currentStep === step

        return (
          <div key={label} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${currentStep <= step ? 'text-indigo-400' : 'text-slate-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${isDone ? 'bg-indigo-600 border-indigo-600 text-white' : isCurrent ? 'border-indigo-500 text-indigo-400' : 'border-slate-700 text-slate-600'}`}>
                {isDone ? '✓' : currentStep}
              </div>
              <span className="text-sm font-medium hidden sm:block">{label}</span>
            </div>
            {index < steps.length - 1 && <div className={`flex-1 h-px mx-3 ${isDone ? 'bg-indigo-500' : 'bg-slate-700'}`} />}
          </div>
        )
      })}
    </div>
  )
}
