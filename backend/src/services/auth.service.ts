import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);

export function getGoogleAuthUrl(state: string): string {
  return googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
  });
}

export async function exchangeGoogleCode(code: string): Promise<{ id: string; name: string; email: string; avatar?: string }> {
  const { tokens } = await googleClient.getToken(code);
  googleClient.setCredentials(tokens);

  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token!,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Invalid Google ID token');
  }

  return {
    id: payload.sub,
    name: (payload.name as string) || 'Google User',
    email: payload.email,
    avatar: (payload.picture as string) || undefined,
  };
}

export async function findOrCreateUser(googleProfile: { id: string; name: string; email: string; avatar?: string }) {
  const existingUser = await prisma.user.findUnique({
    where: { googleId: googleProfile.id },
  });

  if (existingUser) {
    return existingUser;
  }

  const user = await prisma.user.create({
    data: {
      googleId: googleProfile.id,
      name: googleProfile.name,
      email: googleProfile.email,
      avatarUrl: googleProfile.avatar,
    },
  });

  return user;
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function findOrCreateDemoUser(profile: { email: string; name: string }) {
  // Demo users have no googleId — look up by email
  const existing = await prisma.user.findUnique({ where: { email: profile.email } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      name: profile.name,
      email: profile.email,
    },
  });
}
