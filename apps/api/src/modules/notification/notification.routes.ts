import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireBusinessAdmin } from '../../middleware/auth.js';
import { sendNotification, getNotifications } from './notification.service.js';

const sendSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  type: z.enum(['PROMO', 'REMINDER', 'REWARD']).default('PROMO'),
});

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const { businessId } = request.user;
    if (!businessId) return reply.status(400).send({ error: 'businessId requerido' });
    reply.send({ data: await getNotifications(businessId) });
  });

  app.post('/', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const body = sendSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const { businessId } = request.user;
    if (!businessId) return reply.status(400).send({ error: 'businessId requerido' });
    const result = await sendNotification(businessId, body.data.title, body.data.body, body.data.type);
    reply.status(201).send({ data: result });
  });
}
