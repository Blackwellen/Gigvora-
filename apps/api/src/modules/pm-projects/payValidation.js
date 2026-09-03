/**
 * Pure money-safety check for pay splits (spec §25): total percentage
 * allocation across a project can never exceed 100%. No DB/Redis
 * dependency so it's directly unit-testable.
 */
export function validatePercentageTotal(existingSplits, { excludeId, newPercentage }) {
  const total =
    existingSplits.filter((s) => s.allocation_type === 'percentage' && s.id !== excludeId).reduce((sum, s) => sum + Number(s.percentage || 0), 0) + Number(newPercentage);
  return { valid: total <= 100, total: Number(total.toFixed(2)) };
}
