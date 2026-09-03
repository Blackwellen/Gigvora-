import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as passkeysService from './passkeys.service.js';

export const registrationOptionsHandler = asyncHandler(async (req, res) => {
  const options = await passkeysService.getRegistrationOptions({ userId: req.user.sub });
  res.json(options);
});

export const registrationVerifyHandler = asyncHandler(async (req, res) => {
  const result = await passkeysService.verifyRegistration({ userId: req.user.sub, response: req.body.response, label: req.body.label });
  res.status(201).json(result);
});

export const authenticationOptionsHandler = asyncHandler(async (req, res) => {
  const options = await passkeysService.getAuthenticationOptions({ email: req.body.email });
  res.json(options);
});

export const authenticationVerifyHandler = asyncHandler(async (req, res) => {
  const result = await passkeysService.verifyAuthentication({ response: req.body.response }, req);
  res.json(result);
});

export const listHandler = asyncHandler(async (req, res) => {
  const passkeys = await passkeysService.listPasskeys({ userId: req.user.sub });
  res.json({ passkeys });
});

export const renameHandler = asyncHandler(async (req, res) => {
  const passkey = await passkeysService.renamePasskey({ userId: req.user.sub, credentialRowId: req.params.id, label: req.body.label });
  res.json(passkey);
});

export const removeHandler = asyncHandler(async (req, res) => {
  const result = await passkeysService.removePasskey({ userId: req.user.sub, credentialRowId: req.params.id });
  res.json(result);
});
