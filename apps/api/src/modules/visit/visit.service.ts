/**
 * Visit Service
 *
 * Registra una visita/sello. Flujo:
 * 1. Busca al cliente por cardCode (dentro del negocio del staff)
 * 2. Calcula los puntos a agregar según cardType
 * 3. Actualiza balance del cliente en la DB
 * 4. Si llega al umbral → registra recompensa, reinicia balance
 * 5. Parchea el Google Wallet Object (actualización push en el cel)
 * 6. Envía push APNs para Apple Wallet
 */

import { prisma } from '../../lib/prisma.js';
import { patchObject } from '../wallet/google/google-wallet.service.js';
import { pushAppleUpdate } from '../wallet/apple/apple-wallet.service.js';

export interface RecordVisitInput {
  cardCode: string;
  businessId: string;
  staffId?: string;
  amount?: number;   // para cashback/prepago
  note?: string;
}

export async function recordVisit(input: RecordVisitInput) {
  const customer = await prisma.customer.findUnique({
    where: { cardCode: input.cardCode },
    include: {
      business: true,
      appleDevices: true,
    },
  });

  if (!customer) throw new Error('CUSTOMER_NOT_FOUND');
  if (customer.businessId !== input.businessId) throw new Error('CUSTOMER_NOT_FOUND');

  const business = customer.business;

  // Calcular puntos ganados según tipo de tarjeta
  let pointsEarned = 1;
  if (business.cardType === 'POINTS') {
    pointsEarned = Math.floor(input.amount ?? 0);
  } else if (business.cardType === 'CASHBACK') {
    // Cashback: se guarda como porcentaje (ej: 5% de $200 = 10 puntos)
    pointsEarned = (input.amount ?? 0) * 0.05;
  } else if (business.cardType === 'PREPAID') {
    // Prepago: descontar del saldo
    pointsEarned = -(input.amount ?? 0);
  }

  const newBalance = customer.balance + pointsEarned;
  const rewardGiven = business.cardType !== 'PREPAID' && newBalance >= business.threshold;
  const finalBalance = rewardGiven ? newBalance - business.threshold : newBalance;

  // Guardar visita
  const visit = await prisma.visit.create({
    data: {
      businessId: input.businessId,
      customerId: customer.id,
      staffId: input.staffId,
      pointsEarned,
      amount: input.amount,
      rewardGiven,
      note: input.note,
    },
  });

  // Actualizar stats del cliente
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      balance: finalBalance,
      totalVisits: { increment: 1 },
      totalRewards: rewardGiven ? { increment: 1 } : undefined,
    },
  });

  // Actualizar wallet (async — no bloquea la respuesta al staff)
  const updatedCustomer = { ...customer, balance: finalBalance };
  patchObject(business, updatedCustomer).catch(e => console.error('[Google Wallet patch]', e));

  if (customer.appleDevices.length > 0) {
    pushAppleUpdate(customer, customer.appleDevices).catch(e =>
      console.error('[APNs push]', e)
    );
  }

  return {
    visit,
    customer: {
      id: customer.id,
      name: customer.name,
      balance: finalBalance,
      totalVisits: customer.totalVisits + 1,
      rewardGiven,
      reward: rewardGiven ? business.reward : null,
      threshold: business.threshold,
      cardType: business.cardType,
    },
  };
}

export async function getVisits(businessId: string, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const [visits, total] = await Promise.all([
    prisma.visit.findMany({
      where: { businessId },
      include: {
        customer: { select: { name: true, email: true, cardCode: true } },
        staff: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.visit.count({ where: { businessId } }),
  ]);
  return { visits, total, page, pages: Math.ceil(total / limit) };
}
