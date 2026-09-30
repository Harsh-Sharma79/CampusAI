import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

export async function getSettings(userId: string) {
  const settings = await prisma.userSettings.findUnique({ where: { userId }, select: { preferredStudyMinutes: true, notificationsEnabled: true, emailNotifications: true, aiResponseStyle: true, createdAt: true, updatedAt: true } });
  if (!settings) throw new ApiError(404, 'SETTINGS_NOT_FOUND', 'User settings not found');
  return settings;
}

export async function updateSettings(userId: string, input: { preferredStudyMinutes?: number; notificationsEnabled?: boolean; emailNotifications?: boolean; aiResponseStyle?: string }) {
  return prisma.userSettings.upsert({
    where: { userId }, create: { userId, ...input }, update: input,
    select: { preferredStudyMinutes: true, notificationsEnabled: true, emailNotifications: true, aiResponseStyle: true, createdAt: true, updatedAt: true }
  });
}
