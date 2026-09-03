// Deterministic stock placeholder avatar photos for demo/marketing content
// (testimonials, sample talent cards, leadership grids) that isn't backed by
// a real uploaded photo. pravatar.cc serves generic stock headshot photos
// explicitly intended for placeholder/demo use — not real photos of the
// named person, purely decorative. Real user-uploaded avatars (profiles,
// companies) always take priority over this and never call it.
export function getPlaceholderAvatarUrl(seed: string): string {
  const normalized = encodeURIComponent(seed.trim().toLowerCase());
  return `https://i.pravatar.cc/150?u=${normalized}`;
}
