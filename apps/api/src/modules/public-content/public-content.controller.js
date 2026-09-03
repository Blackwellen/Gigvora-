import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import * as service from './public-content.service.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LEAD_TYPES = ['demo', 'sales', 'enterprise', 'recruiter', 'sales_navigator', 'partnership', 'general_contact'];

export const getPageHandler = asyncHandler(async (req, res) => {
  const locale = typeof req.query.locale === 'string' ? req.query.locale : 'en-US';
  const page = await service.getPublishedPageBySlug(req.params.slug, locale);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json({ data: page });
});

export const subscribeNewsletterHandler = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim();
  if (!EMAIL_RE.test(email)) {
    throw new AppError('Enter a valid email address.', 422, { code: 'INVALID_EMAIL' });
  }
  const result = await service.subscribeNewsletter({ email, source: req.body?.source || 'website' });
  res.status(201).json({ data: result });
});

export const submitContactHandler = asyncHandler(async (req, res) => {
  const { email, name, company, jobTitle, phone, companySize, topic, message, consentGiven, source, campaign } = req.body || {};

  if (!EMAIL_RE.test(String(email || ''))) {
    throw new AppError('Enter a valid email address.', 422, { code: 'INVALID_EMAIL' });
  }
  if (!name || !String(name).trim()) {
    throw new AppError('Name is required.', 422, { code: 'NAME_REQUIRED' });
  }
  if (!message || !String(message).trim()) {
    throw new AppError('Please tell us how we can help.', 422, { code: 'MESSAGE_REQUIRED' });
  }
  if (!consentGiven) {
    throw new AppError('Please accept the Privacy Policy and Terms of Service.', 422, { code: 'CONSENT_REQUIRED' });
  }

  const leadType = LEAD_TYPES.includes(topic) ? topic : 'general_contact';

  const lead = await service.createMarketingLead({
    email,
    name,
    company,
    jobTitle,
    phone,
    companySize,
    leadType,
    topic,
    message,
    consentGiven: Boolean(consentGiven),
    source: source || 'contact_page',
    campaign,
    referrer: req.get('referer') || null,
  });

  res.status(201).json({ data: { id: lead.id, status: lead.status } });
});

export const requestDemoHandler = asyncHandler(async (req, res) => {
  const { email, name, company, jobTitle, phone, companySize, message, consentGiven, source, campaign, product } = req.body || {};

  if (!EMAIL_RE.test(String(email || ''))) {
    throw new AppError('Enter a valid email address.', 422, { code: 'INVALID_EMAIL' });
  }
  if (!consentGiven) {
    throw new AppError('Please accept the Privacy Policy and Terms of Service.', 422, { code: 'CONSENT_REQUIRED' });
  }

  const lead = await service.createMarketingLead({
    email,
    name,
    company,
    jobTitle,
    phone,
    companySize,
    leadType: 'demo',
    topic: product || 'demo_request',
    message,
    consentGiven: true,
    source: source || 'demo_request',
    campaign,
    referrer: req.get('referer') || null,
  });

  res.status(201).json({ data: { id: lead.id, status: lead.status } });
});
