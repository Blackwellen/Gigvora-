const BAND_STYLES: Record<string, { label: string; className: string; icon: string }> = {
  low: { label: 'Low', className: 'bg-green-50 text-green-700', icon: '✓' },
  medium: { label: 'Medium', className: 'bg-amber-50 text-amber-700', icon: '⚠' },
  high: { label: 'High', className: 'bg-red-50 text-red-700', icon: '⛔' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800', icon: '⛔' },
};

export function RiskBadge({ band }: { band?: string | null }) {
  const style = BAND_STYLES[band || 'low'] || BAND_STYLES.low;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}>
      {style.icon} {style.label}
    </span>
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  low: 'bg-green-50 text-green-700',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-700',
  critical: 'bg-red-100 text-red-800',
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${SEVERITY_STYLES[severity] || 'bg-gray-100 text-gray-600'}`}>
      {severity}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-red-50 text-red-700',
    active: 'bg-green-50 text-green-700',
    investigating: 'bg-amber-50 text-amber-700',
    resolved: 'bg-green-50 text-green-700',
    dismissed: 'bg-gray-100 text-gray-500',
    revoked: 'bg-gray-100 text-gray-500',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}
