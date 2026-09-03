import { db } from '../../db/connection.js';
import { getUserEntitlements } from '../billing/billing.service.js';
import { hasFeature } from '../billing/entitlements.js';

function audienceAllows(item, { accountType, workspaceType }) {
  const audience = Array.isArray(item.audience) ? item.audience : [];
  if (audience.length === 0) return true;
  if (audience.includes(accountType)) return true;
  if (workspaceType === 'organization' && audience.includes('organization')) return true;
  if (workspaceType === 'personal' && audience.includes('personal')) return true;
  return false;
}

// A nav item can additionally require a billing entitlement (e.g. Sales
// Navigator, Enterprise Connect) via metadata.requiredFeature. There is no
// dedicated column for this — navigation_items already has a flexible
// `metadata` jsonb column, so the feature key lives there rather than
// warranting a new migration. '*' in a plan's feature list (see
// entitlements.js) grants every requiredFeature.
//
// The inverse also exists — metadata.hideIfFeature hides an item once the
// user already has a given feature (e.g. the "Upgrade to Recruiter Pro"
// upsell link under Work > Hire disappears once the user actually has the
// recruiter_pro feature).
function requiredFeatureAllows(item, features) {
  const requiredFeature = item.metadata?.requiredFeature;
  if (requiredFeature && !hasFeature(features, requiredFeature)) return false;
  const hideIfFeature = item.metadata?.hideIfFeature;
  if (hideIfFeature && hasFeature(features, hideIfFeature)) return false;
  return true;
}

function isVisible(item, { accountType, workspaceType, features }) {
  if (!item.is_active) return false;
  if (!audienceAllows(item, { accountType, workspaceType })) return false;
  if (!requiredFeatureAllows(item, features)) return false;
  return true;
}

function toNode(item) {
  return {
    id: item.id,
    key: item.key,
    itemType: item.item_type,
    navGroup: item.nav_group,
    label: item.label,
    description: item.description,
    route: item.route,
    iconKey: item.icon_key,
    supportsMegaMenu: item.supports_mega_menu,
    orderIndex: item.order_index,
    metadata: item.metadata,
    children: [],
  };
}

function buildTree(rows) {
  const byId = new Map(rows.map((r) => [r.id, toNode(r)]));
  const roots = [];

  for (const row of rows) {
    const node = byId.get(row.id);
    if (row.parent_id && byId.has(row.parent_id)) {
      byId.get(row.parent_id).children.push(node);
    } else if (!row.parent_id) {
      roots.push(node);
    }
  }

  const sortRec = (nodes) => {
    nodes.sort((a, b) => a.orderIndex - b.orderIndex);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

/**
 * Full navigation tree (top-level items with nested mega-menu sections/links),
 * filtered by audience server-side. Never send an item the caller isn't
 * entitled to and let the client hide it — filtering happens here.
 */
async function resolveFeatures(userId) {
  if (!userId) return [];
  const entitlements = await getUserEntitlements(userId);
  return entitlements.features;
}

export async function getNavigationTree({ accountType, workspaceType, userId }) {
  const features = await resolveFeatures(userId);
  const rows = await db('navigation_items').orderBy('order_index', 'asc');
  const visible = rows.filter((r) => isVisible(r, { accountType, workspaceType, features }));
  const visibleIds = new Set(visible.map((r) => r.id));
  // keep a row only if it's visible AND (it's a root OR its parent chain is visible)
  const kept = visible.filter((r) => !r.parent_id || visibleIds.has(r.parent_id));
  return buildTree(kept);
}

export async function getMegaMenu(key, { accountType, workspaceType, userId }) {
  const features = await resolveFeatures(userId);
  const top = await db('navigation_items').where({ key }).first();
  if (!top) return null;
  const rows = await db('navigation_items').orderBy('order_index', 'asc');
  const visible = rows.filter((r) => isVisible(r, { accountType, workspaceType, features }));
  const visibleIds = new Set(visible.map((r) => r.id));
  const kept = visible.filter((r) => r.id === top.id || !r.parent_id || visibleIds.has(r.parent_id));
  const [tree] = buildTree(kept.filter((r) => r.id === top.id || isDescendant(r, top.id, rows)));
  return tree || null;
}

function isDescendant(row, ancestorId, allRows) {
  let current = row;
  const byId = new Map(allRows.map((r) => [r.id, r]));
  while (current.parent_id) {
    if (current.parent_id === ancestorId) return true;
    current = byId.get(current.parent_id);
    if (!current) return false;
  }
  return false;
}

const DEFAULT_PREFS = {
  pinned_item_keys: [],
  hidden_item_keys: [],
  custom_order: [],
  last_route: null,
  menu_density: 'comfortable',
  show_icons: true,
  personalisation_enabled: true,
};

const DEFAULT_PREFS_DB = {
  ...DEFAULT_PREFS,
  pinned_item_keys: JSON.stringify(DEFAULT_PREFS.pinned_item_keys),
  hidden_item_keys: JSON.stringify(DEFAULT_PREFS.hidden_item_keys),
  custom_order: JSON.stringify(DEFAULT_PREFS.custom_order),
};

export async function getPreferences(userId, companyId) {
  const row = await db('user_navigation_preferences')
    .where({ user_id: userId })
    .andWhere(companyId ? { organization_id: companyId } : { organization_id: null })
    .first();
  return row || { user_id: userId, organization_id: companyId || null, ...DEFAULT_PREFS };
}

export async function updatePreferences(userId, companyId, patch) {
  const existing = await db('user_navigation_preferences')
    .where({ user_id: userId })
    .andWhere(companyId ? { organization_id: companyId } : { organization_id: null })
    .first();

  const allowed = {
    pinned_item_keys: patch.pinnedItemKeys && JSON.stringify(patch.pinnedItemKeys),
    hidden_item_keys: patch.hiddenItemKeys && JSON.stringify(patch.hiddenItemKeys),
    custom_order: patch.customOrder && JSON.stringify(patch.customOrder),
    last_route: patch.lastRoute,
    menu_density: patch.menuDensity,
    show_icons: patch.showIcons,
    personalisation_enabled: patch.personalisationEnabled,
  };
  const fields = Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined));

  if (existing) {
    const [row] = await db('user_navigation_preferences').where({ id: existing.id }).update(fields).returning('*');
    return row;
  }

  const [row] = await db('user_navigation_preferences')
    .insert({ user_id: userId, organization_id: companyId || null, ...DEFAULT_PREFS_DB, ...fields })
    .returning('*');
  return row;
}

export async function togglePin(userId, companyId, itemKey, pinned) {
  const prefs = await getPreferences(userId, companyId);
  const current = new Set(prefs.pinned_item_keys || []);
  if (pinned) current.add(itemKey);
  else current.delete(itemKey);
  return updatePreferences(userId, companyId, { pinnedItemKeys: [...current] });
}
