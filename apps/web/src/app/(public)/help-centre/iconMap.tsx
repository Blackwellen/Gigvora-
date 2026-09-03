import { Rocket, User, Building2, UserSearch, CreditCard, Briefcase, Shield, MessageCircle, Wrench, LifeBuoy } from 'lucide-react';

// Maps the seeded help_categories.icon_key values to a real lucide icon.
export const HELP_CATEGORY_ICONS: Record<string, typeof Rocket> = {
  rocket: Rocket,
  user: User,
  building: Building2,
  'user-search': UserSearch,
  'credit-card': CreditCard,
  briefcase: Briefcase,
  shield: Shield,
  message: MessageCircle,
  wrench: Wrench,
};

export function helpCategoryIcon(key: string) {
  return HELP_CATEGORY_ICONS[key] ?? LifeBuoy;
}
