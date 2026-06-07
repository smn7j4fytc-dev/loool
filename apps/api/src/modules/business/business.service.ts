import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { createOrUpdateClass } from '../wallet/google/google-wallet.service.js';
import { generateQrDataUrl } from '../qr/qr.service.js';
import { env } from '../../config/env.js';
import type { CardType, Plan } from '@prisma/client';

export interface CreateBusinessInput {
  slug: string;
  name: string;
  adminEmail: string;
  adminPassword: string;
  cardType?: CardType;
  threshold?: number;
  reward?: string;
  primaryColor?: string;
  secondaryColor?: string;
  plan?: Plan;
}

export interface UpdateBusinessInput {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  cardType?: CardType;
  threshold?: number;
  reward?: string;
  pointsLabel?: string;
  locations?: unknown;
  plan?: Plan;
}

export async function getAllBusinesses() {
  return prisma.business.findMany({
    select: {
      id: true, slug: true, name: true, logoUrl: true, plan: true, active: true,
      primaryColor: true, cardType: true, threshold: true, reward: true,
      adminEmail: true, createdAt: true,
      _count: { select: { customers: true, visits: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBusinessById(id: string) {
  return prisma.business.findUnique({
    where: { id },
    select: {
      id: true, slug: true, name: true, logoUrl: true, plan: true, active: true,
      primaryColor: true, secondaryColor: true, textColor: true,
      cardType: true, threshold: true, reward: true, pointsLabel: true,
      locations: true, googleClassId: true, adminEmail: true,
      createdAt: true, updatedAt: true,
      _count: { select: { customers: true, visits: true, staff: true } },
    },
  });
}

export async function getBusinessBySlug(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, logoUrl: true,
      primaryColor: true, secondaryColor: true, textColor: true,
      cardType: true, threshold: true, reward: true, pointsLabel: true,
      locations: true, active: true,
    },
  });
}

export async function createBusiness(input: CreateBusinessInput) {
  const hashedPassword = await bcrypt.hash(input.adminPassword, 12);
  return prisma.business.create({
    data: {
      slug: input.slug,
      name: input.name,
      adminEmail: input.adminEmail,
      adminPassword: hashedPassword,
      cardType: input.cardType ?? 'PUNCH',
      threshold: input.threshold ?? 10,
      reward: input.reward ?? '1 gratis',
      primaryColor: input.primaryColor ?? '#7C3AED',
      plan: input.plan ?? 'FREE',
    },
  });
}

export async function updateBusiness(id: string, input: UpdateBusinessInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.business.update({ where: { id }, data: input as any });
}

export async function setupGoogleWallet(businessId: string) {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
  const classId = await createOrUpdateClass(business);
  await prisma.business.update({ where: { id: businessId }, data: { googleClassId: classId } });
  return classId;
}

export async function getMasterQrCode(businessId: string) {
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    select: { slug: true, name: true },
  });
  const registrationUrl = `${env.WEB_URL}/r/${business.slug}`;
  const qrDataUrl = await generateQrDataUrl(registrationUrl);
  return { registrationUrl, qrDataUrl, businessName: business.name };
}
