export function FormAlert({ tone = 'error', title, children }: { tone?: 'error' | 'success' | 'warning'; title: string; children?: React.ReactNode }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-green-200 bg-green-50 text-green-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`} role="alert">
      <p className="font-semibold">{title}</p>
      {children && <p className="mt-0.5">{children}</p>}
    </div>
  );
}
