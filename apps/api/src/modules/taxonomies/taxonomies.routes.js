// Read-only canonical reference data (countries, project categories).
// Requires auth like the rest of the authenticated app shell, but carries
// no per-user logic — cacheable indefinitely on the client since these
// lists only ever change via a code deploy, not user action. Skills/tags
// deliberately are NOT duplicated here: they already have a canonical,
// searchable source at GET /professional-profile/skills/search
// (modules/professional-profile/skills.service.js) — reuse that instead of
// building a second tag taxonomy.
import { Router } from 'express';
import { requireAuth } from '../../common/middleware/auth.js';
import { COUNTRIES } from '../../common/taxonomies/countries.js';
import { PROJECT_CATEGORY_GROUPS, PROJECT_CATEGORIES } from '../../common/taxonomies/projectCategories.js';

const router = Router();
router.use(requireAuth);

router.get('/countries', (req, res) => {
  res.set('Cache-Control', 'private, max-age=86400');
  res.json({ data: COUNTRIES });
});

router.get('/project-categories', (req, res) => {
  res.set('Cache-Control', 'private, max-age=86400');
  res.json({ data: { groups: PROJECT_CATEGORY_GROUPS, flat: PROJECT_CATEGORIES } });
});

export default router;
