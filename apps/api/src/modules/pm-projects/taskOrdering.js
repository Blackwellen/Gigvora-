/**
 * Rule-based ordering used by the "Suggested order" toggle on the Tasks page
 * — due date first (soonest/overdue wins), then priority. Deliberately NOT
 * presented as an AI/ML score: real model-backed prioritisation is a
 * later-phase integration with apps/ml-service, and shipping a fabricated
 * confidence number here would violate the "no placeholder ML percentages"
 * requirement. Pure/no dependencies so it's unit-testable in isolation and
 * safely importable from the web client's mirrored copy.
 */
const PRIORITY_WEIGHT = { urgent: 0, high: 1, medium: 2, low: 3 };

export function sortBySuggestedOrder(tasks) {
  return [...tasks].sort((a, b) => {
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    if (aDue !== bDue) return aDue - bDue;
    return (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9);
  });
}
