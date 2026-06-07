import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireSuperAdmin, requireBusinessAdmin, assertBusiness } from '../../middleware/auth.js';
import {
  getAllBusinesses, getBusinessById, getBusinessBySlug, createBusiness,
  updateBusiness, setupGoogleWallet, getMasterQrCode,
} from './business.service.js';

const createSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Solo letras, números y guiones'),
  name: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  cardType: z.enum(['PUNCH', 'POINTS', 'CASHBACK', 'DISCOUNT', 'COUPON', 'PREPAID']).optional(),
  threshold: z.number().int().min(2).max(100).optional(),
  reward: z.string().max(200).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']).optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  cardType: z.enum(['PUNCH', 'POINTS', 'CASHBACK', 'DISCOUNT', 'COUPON', 'PREPAID']).optional(),
  threshold: z.number().int().min(2).max(100).optional(),
  reward: z.string().max(200).optional(),
  pointsLabel: z.string().max(30).optional(),
  locations: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
    name: z.string().optional(),
    maxDistance: z.number().optional(),
  })).optional(),
  plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']).optional(),
});

export async function businessRoutes(app: FastifyInstance) {
  // Super admin: lista todos los negocios
  app.get('/', { preHandler: [requireSuperAdmin] }, async (_req, reply) => {
    const businesses = await getAllBusinesses();
    reply.send({ data: businesses });
  });

  // Super admin: crear negocio
  app.post('/', { preHandler: [requireSuperAdmin] }, async (request, reply) => {
    const body = createSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const business = await createBusiness(body.data);
    reply.status(201).send({ data: business });
  });

  // Ver negocio (admin del negocio o super admin)
  app.get('/:id', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!assertBusiness(request, id)) return reply.status(403).send({ error: 'Acceso denegado' });
    const business = await getBusinessById(id);
    if (!business) return reply.status(404).send({ error: 'Negocio no encontrado' });
    reply.send({ data: business });
  });

  // Actualizar config del negocio
  app.patch('/:id', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!assertBusiness(request, id)) return reply.status(403).send({ error: 'Acceso denegado' });
    const body = updateSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const business = await updateBusiness(id, body.data);
    reply.send({ data: business });
  });

  // Crear/actualizar Google Wallet LoyaltyClass
  app.post('/:id/wallet/setup', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!assertBusiness(request, id)) return reply.status(403).send({ error: 'Acceso denegado' });
    const classId = await setupGoogleWallet(id);
    reply.send({ data: { classId, message: 'Google Wallet class creada/actualizada' } });
  });

  // Obtener QR maestro de registro
  app.get('/:id/qr', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!assertBusiness(request, id)) return reply.status(403).send({ error: 'Acceso denegado' });
    const qr = await getMasterQrCode(id);
    reply.send({ data: qr });
  });

  // Ruta pública: obtener info básica del negocio por slug (para la landing)
  app.get('/public/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const business = await getBusinessBySlug(slug);
    if (!business || !business.active) return reply.status(404).send({ error: 'Negocio no encontrado' });
    reply.send({ data: business });
  });
}
