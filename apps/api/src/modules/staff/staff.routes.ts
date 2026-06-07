import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireBusinessAdmin } from '../../middleware/auth.js';
import { getStaff, createStaff, toggleStaff, deleteStaff } from './staff.service.js';

const createSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function staffRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const { businessId } = request.user;
    if (!businessId) return reply.status(400).send({ error: 'businessId requerido' });
    reply.send({ data: await getStaff(businessId) });
  });

  app.post('/', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const body = createSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const { businessId } = request.user;
    if (!businessId) return reply.status(400).send({ error: 'businessId requerido' });
    const staff = await createStaff(businessId, body.data.name, body.data.email, body.data.password);
    reply.status(201).send({ data: staff });
  });

  app.patch('/:id/toggle', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { businessId } = request.user;
    if (!businessId) return reply.status(400).send({ error: 'businessId requerido' });
    try {
      reply.send({ data: await toggleStaff(id, businessId) });
    } catch {
      reply.status(404).send({ error: 'Staff no encontrado' });
    }
  });

  app.delete('/:id', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { businessId } = request.user;
    if (!businessId) return reply.status(400).send({ error: 'businessId requerido' });
    try {
      await deleteStaff(id, businessId);
      reply.send({ data: { deleted: true } });
    } catch {
      reply.status(404).send({ error: 'Staff no encontrado' });
    }
  });
}
