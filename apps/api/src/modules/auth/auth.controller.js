import { asyncHandler } from '../../common/utils/asyncHandler.js';
import * as authService from './auth.service.js';

export const registerHandler = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, req);
  res.status(201).json(result);
});

export const loginHandler = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, req);
  res.status(200).json(result);
});

export const refreshHandler = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body, req);
  res.status(200).json(result);
});

export const meHandler = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser({ userId: req.user.sub });
  res.status(200).json({ user });
});

export const logoutHandler = asyncHandler(async (req, res) => {
  await authService.logout({ sessionId: req.user.sid });
  res.status(204).send();
});

export const logoutAllHandler = asyncHandler(async (req, res) => {
  await authService.logoutAll({ userId: req.user.sub, currentSessionId: req.user.sid });
  res.status(204).send();
});

export const resendVerificationHandler = asyncHandler(async (req, res) => {
  const result = await authService.resendVerificationEmail({ userId: req.user.sub });
  res.status(200).json({ sent: true, devToken: result.token });
});

export const verifyEmailHandler = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body);
  res.status(200).json(result);
});

export const forgotPasswordHandler = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body, req);
  res.status(200).json({ sent: true, devToken: result.token });
});

export const resetPasswordHandler = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body, req);
  res.status(200).json(result);
});

export const completeMfaSignInHandler = asyncHandler(async (req, res) => {
  const result = await authService.completeMfaSignIn(req.body, req);
  res.status(200).json(result);
});

export const changePasswordHandler = asyncHandler(async (req, res) => {
  const result = await authService.changePassword({
    userId: req.user.sub,
    currentSessionId: req.user.sid,
    ...req.body,
  });
  res.status(200).json(result);
});
