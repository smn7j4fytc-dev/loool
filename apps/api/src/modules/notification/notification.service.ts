import { prisma } from '../../lib/prisma.js';
import { pushAppleUpdate } from '../wallet/apple/apple-wallet.service.js';
import type { NotificationType } from '@prisma/client';

export async function sendNotification(
  businessId: string,
  title: string,
  body: string,
  type: NotificationType = 'PROMO'
) {
  // Crear registro de la campaña
  const notification = await prisma.notification.create({
    data: { businessId, title, body, type },
  });

  // Obtener todos los clientes con dispositivos Apple registrados
  const customersWithDevices = await prisma.customer.findMany({
    where: { businessId },
    include: { appleDevices: true },
  });

  let recipientCount = 0;

  // Push APNs para clientes con Apple Wallet
  const pushPromises = customersWithDevices
    .filter(c => c.appleDevices.length > 0)
    .map(async c => {
      try {
        await pushAppleUpdate(c, c.appleDevices);
        recipientCount++;
      } catch (e) {
        console.error(`[APNs] Error pushing to customer ${c.id}:`, e);
      }
    });

  await Promise.allSettled(pushPromises);

  // Actualizar con cuántos recibieron la notificación
  await prisma.notification.update({
    where: { id: notification.id },
    data: { sentAt: new Date(), recipientCount },
  });

  return { ...notification, recipientCount, sentAt: new Date() };
}

export async function getNotifications(businessId: string) {
  return prisma.notification.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}
