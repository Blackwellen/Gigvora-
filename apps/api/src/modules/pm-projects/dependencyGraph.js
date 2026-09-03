/**
 * True if adding `dependsOnTaskId -> taskId` would close a cycle, given the
 * project's existing edges — walked as a pure in-memory graph so it's
 * unit-testable without a DB. No DB/Redis dependency.
 */
export function wouldCreateCycle(edges, taskId, dependsOnTaskId) {
  if (taskId === dependsOnTaskId) return true;
  const adjacency = new Map();
  for (const e of edges) {
    if (!adjacency.has(e.dependsOnTaskId)) adjacency.set(e.dependsOnTaskId, []);
    adjacency.get(e.dependsOnTaskId).push(e.taskId);
  }
  // Would dependsOnTaskId already be (transitively) reachable from taskId? If
  // so, adding taskId -> depends-on -> ... -> taskId would close a loop.
  const stack = [taskId];
  const seen = new Set();
  while (stack.length) {
    const current = stack.pop();
    if (current === dependsOnTaskId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of adjacency.get(current) || []) stack.push(next);
  }
  return false;
}
