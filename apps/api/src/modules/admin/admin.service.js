// Server-side authority for what each platform-staff role can see in the admin shell sidebar.
// The frontend never hardcodes this — it renders exactly the `sections` array this returns, so
// authorization logic lives in one place.
const ROLE_SECTIONS = {
  super_admin: ['overview', 'users', 'moderation', 'support', 'finance', 'system', 'intelligence', 'roles'],
  admin: ['overview', 'users', 'moderation', 'support', 'finance', 'intelligence'],
  moderator: ['overview', 'moderation'],
  customer_service: ['overview', 'support', 'users'],
  finance: ['overview', 'finance'],
};

export function getAdminContext(role) {
  return {
    role,
    sections: ROLE_SECTIONS[role] || [],
  };
}

export { ROLE_SECTIONS };
