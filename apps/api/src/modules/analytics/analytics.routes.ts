import type { FastifyInstance } from 'fastify';
import { requireBusinessAdmin } from '../../middleware/auth.js';
import { getBusinessAnalytics } from './analytics.service.js';

export async function analyticsRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const { businessId } = request.user;
    if (!businessId) return reply.status(400).send({ error: 'businessId requerido' });
    const analytics = await getBusinessAnalytics(businessId);
    reply.send({ data: analytics });
  });
}
