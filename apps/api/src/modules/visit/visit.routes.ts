import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireStaff, requireBusinessAdmin } from '../../middleware/auth.js';
import { recordVisit, getVisits } from './visit.service.js';

const recordSchema = z.object({
  cardCode: z.string().min(1),
  amount: z.number().positive().optional(),
  note: z.string().max(200).optional(),
});

export async function visitRoutes(app: FastifyInstance) {
  // Staff o admin registra una visita
  app.post('/', { preHandler: [requireStaff] }, async (request, reply) => {
    const body = recordSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { businessId, sub: staffId, role } = request.user;
    if (!businessId) return reply.status(400).send({ error: 'businessId requerido' });

    try {
      const result = await recordVisit({
        ...body.data,
        businessId,
        staffId: role === 'STAFF' ? staffId : undefined,
      } as any);
      reply.status(201).send({ data: result });
    } catch (err: unknown) {
      const e = err as Error;
      if (e.message === 'CUSTOMER_NOT_FOUND') {
        return reply.status(404).send({ error: 'Código de tarjeta no encontrado' });
      }
      throw err;
    }
  });

  // Admin: listar visitas del negocio
  app.get('/', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const { businessId } = request.user;
    if (!businessId) return reply.status(400).send({ error: 'businessId requerido' });
    const { page, limit } = request.query as { page?: string; limit?: string };
    const result = await getVisits(businessId, Number(page ?? 1), Number(limit ?? 50));
    reply.send({ data: result });
  });
}
