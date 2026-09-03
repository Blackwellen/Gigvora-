import { Router } from 'express';
import {
  listTalentHandler,
  listFeaturedTalentHandler,
  getTalentBySlugHandler,
  listCompaniesHandler,
  listFeaturedCompaniesHandler,
  getCompanyBySlugHandler,
  listJobsHandler,
  getJobBySlugHandler,
  getPostByIdHandler,
} from './public-directory.controller.js';

const talentRouter = Router();
talentRouter.get('/', listTalentHandler);
talentRouter.get('/featured', listFeaturedTalentHandler);
talentRouter.get('/:slug', getTalentBySlugHandler);

const companiesRouter = Router();
companiesRouter.get('/', listCompaniesHandler);
companiesRouter.get('/featured', listFeaturedCompaniesHandler);
companiesRouter.get('/:slug', getCompanyBySlugHandler);

const jobsRouter = Router();
jobsRouter.get('/', listJobsHandler);
jobsRouter.get('/:slug', getJobBySlugHandler);

const postsRouter = Router();
postsRouter.get('/:id', getPostByIdHandler);

export { talentRouter, companiesRouter, jobsRouter, postsRouter };
