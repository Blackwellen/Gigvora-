/**
 * Small, dedicated vCard (VCF) parser — no shelling out, no third-party
 * dependency. Supports vCard 3.0/4.0 basic property lines (FN, N, EMAIL,
 * TEL, ORG, TITLE, ADR) and unfolds line-continuations per RFC 6350 §3.2.
 */
export function parseVcf(text) {
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\n/);

  const cards = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^BEGIN:VCARD$/i.test(line)) {
      current = {};
      continue;
    }
    if (/^END:VCARD$/i.test(line)) {
      if (current) cards.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const propPart = line.slice(0, colonIndex);
    const value = line.slice(colonIndex + 1);
    const [propName] = propPart.split(';');
    const prop = propName.toUpperCase();

    switch (prop) {
      case 'FN':
        current.fullName = value;
        break;
      case 'N': {
        const parts = value.split(';');
        current.lastName = parts[0] || current.lastName;
        current.firstName = parts[1] || current.firstName;
        break;
      }
      case 'EMAIL':
        current.emails = current.emails || [];
        current.emails.push(value);
        break;
      case 'TEL':
        current.phones = current.phones || [];
        current.phones.push(value);
        break;
      case 'ORG':
        current.company = value.split(';')[0];
        break;
      case 'TITLE':
        current.title = value;
        break;
      case 'ADR': {
        const parts = value.split(';');
        current.location = parts.filter(Boolean).join(', ');
        break;
      }
      default:
        break;
    }
  }

  return cards.map((card) => ({
    first_name: card.firstName || (card.fullName ? card.fullName.split(' ')[0] : null),
    last_name: card.lastName || (card.fullName ? card.fullName.split(' ').slice(1).join(' ') : null),
    email: card.emails?.[0] || null,
    phone: card.phones?.[0] || null,
    company_name: card.company || null,
    title: card.title || null,
    location: card.location || null,
  }));
}
