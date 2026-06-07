/**
 * Apple PassKit Web Service
 *
 * Apple llama a estos endpoints para:
 * 1. Registrar un dispositivo cuando el usuario agrega el pass
 * 2. Borrar el registro cuando lo elimina
 * 3. Preguntar si hay una versión actualizada del pass
 * 4. Listar qué passes están registrados en un dispositivo
 *
 * Apple firma todas las peticiones con el authenticationToken del pass.
 * Referencia: https://developer.apple.com/documentation/walletpasses/building_a_pass_web_service
 */

import type { FastifyInstance } from 'fastify';
import { prisma } from '../../../lib/prisma.js';

export async function appleWalletRoutes(app: FastifyInstance) {
  // Registrar dispositivo
  app.post(
    '/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber',
    async (request, reply) => {
      const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = request.params as {
        deviceLibraryIdentifier: string;
        passTypeIdentifier: string;
        serialNumber: string;
      };
      const authHeader = request.headers.authorization;
      const pushToken = (request.body as { pushToken?: string })?.pushToken;

      if (!authHeader || !pushToken) return reply.status(401).send();

      const token = authHeader.replace('ApplePass ', '');

      // Verificar token contra la DB
      const customer = await prisma.customer.findFirst({
        where: { applePassSerial: serialNumber, appleAuthToken: token },
      });

      if (!customer) return reply.status(401).send();

      const existing = await prisma.appleDevice.findUnique({
        where: { deviceLibraryIdentifier_passTypeIdentifier: { deviceLibraryIdentifier, passTypeIdentifier } },
      });

      if (existing) {
        return reply.status(200).send(); // Ya registrado
      }

      await prisma.appleDevice.create({
        data: { customerId: customer.id, deviceLibraryIdentifier, pushToken, passTypeIdentifier },
      });

      return reply.status(201).send();
    }
  );

  // Dar de baja dispositivo
  app.delete(
    '/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber',
    async (request, reply) => {
      const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = request.params as {
        deviceLibraryIdentifier: string;
        passTypeIdentifier: string;
        serialNumber: string;
      };
      const authHeader = request.headers.authorization;
      if (!authHeader) return reply.status(401).send();

      const token = authHeader.replace('ApplePass ', '');
      const customer = await prisma.customer.findFirst({
        where: { applePassSerial: serialNumber, appleAuthToken: token },
      });

      if (!customer) return reply.status(401).send();

      await prisma.appleDevice.deleteMany({
        where: { deviceLibraryIdentifier, passTypeIdentifier, customerId: customer.id },
      });

      return reply.status(200).send();
    }
  );

  // Descargar pass actualizado
  app.get('/passes/:passTypeIdentifier/:serialNumber', async (request, reply) => {
    const { serialNumber } = request.params as { serialNumber: string };
    const authHeader = request.headers.authorization;
    if (!authHeader) return reply.status(401).send();

    const token = authHeader.replace('ApplePass ', '');
    const customer = await prisma.customer.findFirst({
      where: { applePassSerial: serialNumber, appleAuthToken: token },
      include: { business: true },
    });

    if (!customer) return reply.status(401).send();

    // En producción: regenerar y firmar el .pkpass actualizado
    // Por ahora devolvemos 304 Not Modified si no hay cambios
    return reply.status(304).send();
  });

  // Listar passes en un dispositivo (para determinar si hay updates)
  app.get('/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier', async (request, reply) => {
    const { deviceLibraryIdentifier, passTypeIdentifier } = request.params as {
      deviceLibraryIdentifier: string;
      passTypeIdentifier: string;
    };
    const { passesUpdatedSince } = request.query as { passesUpdatedSince?: string };

    const devices = await prisma.appleDevice.findMany({
      where: { deviceLibraryIdentifier, passTypeIdentifier },
      include: {
        customer: {
          select: { applePassSerial: true, updatedAt: true },
        },
      },
    });

    const serials = devices
      .filter(d => {
        if (!passesUpdatedSince) return true;
        return d.customer.updatedAt > new Date(passesUpdatedSince);
      })
      .map(d => d.customer.applePassSerial)
      .filter(Boolean);

    if (serials.length === 0) return reply.status(204).send();

    return reply.send({
      serialNumbers: serials,
      lastUpdated: new Date().toISOString(),
    });
  });
}
