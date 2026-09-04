// Human-readable reference numbers (§217) — the DB id stays canonical, these are only for
// display/support-ticket correlation. Format: <PREFIX>-<year>-<6-digit-sequence-ish>.
function randomSuffix() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateReportNumber() {
  return `RPT-${new Date().getFullYear()}-${randomSuffix()}`;
}

export function generateCaseNumber() {
  return `CASE-${new Date().getFullYear()}-${randomSuffix()}`;
}

export function generateAppealNumber() {
  return `APL-${new Date().getFullYear()}-${randomSuffix()}`;
}
