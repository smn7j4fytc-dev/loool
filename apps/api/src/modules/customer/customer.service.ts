import { prisma } from '../../lib/prisma.js';
import {
  createObject as createGoogleObject,
  generateSaveUrl,
} from '../wallet/google/google-wallet.service.js';
import { generateQrDataUrl } from '../qr/qr.service.js';
import { createApplePass } from '../wallet/apple/apple-wallet.service.js';

export interface RegisterCustomerInput {
  businessId: string;
  name: string;
  email: string;
  phone?: string;
}

export async function registerCustomer(input: RegisterCustomerInput) {
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: input.businessId },
  });

  // Idempotente: si ya existe, devolver sus datos actualizados
  const existing = await prisma.customer.findUnique({
    where: { businessId_email: { businessId: input.businessId, email: input.email } },
  });

  if (existing) {
    const saveToGoogleWalletUrl = generateSaveUrl(existing);
    const cardQr = await generateQrDataUrl(existing.cardCode);
    return { customer: existing, saveToGoogleWalletUrl, cardQr, isNew: false };
  }

  // Crear cliente
  const customer = await prisma.customer.create({
    data: {
      businessId: input.businessId,
      name: input.name,
      email: input.email,
      phone: input.phone,
    },
  });

  // Crear Google Wallet Object
  const googleObjectId = await createGoogleObject(business, customer);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { googleObjectId },
  });

  // Crear Apple Wallet pass
  const applePassUrl = await createApplePass(business, customer);

  const saveToGoogleWalletUrl = generateSaveUrl(customer);
  const cardQr = await generateQrDataUrl(customer.cardCode);

  return {
    customer: { ...customer, googleObjectId },
    saveToGoogleWalletUrl,
    applePassUrl,
    cardQr,
    isNew: true,
  };
}

export async function getCustomers(businessId: string, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where: { businessId },
      select: {
        id: true, name: true, email: true, phone: true,
        balance: true, totalVisits: true, totalRewards: true,
        cardCode: true, googleObjectId: true, createdAt: true,
        _count: { select: { visits: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where: { businessId } }),
  ]);
  return { customers, total, page, pages: Math.ceil(total / limit) };
}

export async function getCustomerByCode(cardCode: string, businessId: string) {
  const customer = await prisma.customer.findUnique({
    where: { cardCode },
    include: {
      business: {
        select: { id: true, name: true, cardType: true, threshold: true, reward: true, pointsLabel: true },
      },
    },
  });
  if (!customer || customer.businessId !== businessId) return null;
  return customer;
}

export async function getCustomerById(id: string, businessId: string) {
  return prisma.customer.findFirst({
    where: { id, businessId },
    include: {
      visits: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { staff: { select: { name: true } } },
      },
    },
  });
}
