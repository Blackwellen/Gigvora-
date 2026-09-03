export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.replace(/\D/g, '').length < 7) return null;
  return digits;
}

export function normalizeDomain(value) {
  if (!value || typeof value !== 'string') return null;
  let v = value.trim().toLowerCase();
  v = v.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  return v || null;
}
