export type WizardStep = { label: string; helper: string };

export function WizardStepper({ steps, currentIndex }: { steps: WizardStep[]; currentIndex: number }) {
  return (
    <ol className="flex items-center gap-4 overflow-x-auto pb-1">
      {steps.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'pending';
        return (
          <li key={step.label} className="flex flex-1 items-center gap-3 whitespace-nowrap">
            <span
              className={
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ' +
                (state === 'done'
                  ? 'bg-brand-600 text-white'
                  : state === 'current'
                    ? 'border-2 border-brand-600 bg-brand-600 text-white'
                    : 'border-2 border-gray-200 text-gray-400')
              }
            >
              {state === 'done' ? '✓' : i + 1}
            </span>
            <div className="text-sm">
              <p className={state === 'pending' ? 'font-medium text-gray-400' : 'font-semibold text-gray-900'}>{step.label}</p>
              <p className={state === 'current' ? 'text-brand-600' : 'text-gray-400'}>
                {state === 'done' ? 'Completed' : state === 'current' ? step.helper : 'Pending'}
              </p>
            </div>
            {i < steps.length - 1 && <span className="h-px flex-1 bg-gray-200" />}
          </li>
        );
      })}
    </ol>
  );
}
