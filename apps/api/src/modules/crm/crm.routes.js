import { Router } from 'express';
import accountsRoutes from './accounts.routes.js';
import accountContactRolesRoutes from './account-contact-roles.routes.js';
import contactsRoutes from './contacts.routes.js';
import leadsRoutes from './leads.routes.js';
import opportunitiesRoutes from './opportunities.routes.js';
import pipelineStagesRoutes from './pipeline-stages.routes.js';
import activitiesRoutes from './activities.routes.js';
import followupsRoutes from './followups.routes.js';
import segmentsRoutes from './segments.routes.js';
import savedViewsRoutes from './saved-views.routes.js';
import duplicatesRoutes from './duplicates.routes.js';
import importsRoutes from './imports.routes.js';
import analyticsRoutes from './analytics.routes.js';

const router = Router();

router.use('/accounts/:accountId/roles', accountContactRolesRoutes);
router.use('/accounts', accountsRoutes);
router.use('/contacts', contactsRoutes);
router.use('/leads', leadsRoutes);
router.use('/opportunities', opportunitiesRoutes);
router.use('/pipeline-stages', pipelineStagesRoutes);
router.use('/activities', activitiesRoutes);
router.use('/followups', followupsRoutes);
router.use('/segments', segmentsRoutes);
router.use('/saved-views', savedViewsRoutes);
router.use('/duplicates', duplicatesRoutes);
router.use('/imports', importsRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
