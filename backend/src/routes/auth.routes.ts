import { Router } from 'express';
import { emailLoginController, googleCallbackController, googleLoginController, logoutController, meController } from '../controllers/auth.controller.js';

export const authRouter = Router();

authRouter.get('/google', googleLoginController);
authRouter.get('/google/callback', googleCallbackController);
authRouter.get('/me', meController);
authRouter.post('/logout', logoutController);
authRouter.post('/login', emailLoginController);
