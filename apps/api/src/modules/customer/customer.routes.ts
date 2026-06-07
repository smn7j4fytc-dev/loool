import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireBusinessAdmin, requireStaff, assertBusiness } from '../../middleware/auth.js';
import { registerCustomer, getCustomers, getCustomerByCode, getCustomerById } from './customer.service.js';

const registerSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
});

export async function customerRoutes(app: FastifyInstance) {
  // Público: registrar cliente (viene desde la landing de registro)
  app.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const result = await registerCustomer(body.data as any);
    reply.status(result.isNew ? 201 : 200).send({ data: result });
  });

  // Admin: listar clientes del negocio
  app.get('/', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const { businessId } = request.user;
    if (!businessId) return reply.status(400).send({ error: 'businessId requerido' });
    const { page, limit } = request.query as { page?: string; limit?: string };
    const result = await getCustomers(businessId, Number(page ?? 1), Number(limit ?? 50));
    reply.send({ data: result });
  });

  // Admin: ver cliente por ID
  app.get('/:id', { preHandler: [requireBusinessAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { businessId } = request.user;
    if (!businessId) return reply.status(400).send({ error: 'businessId requerido' });
    const customer = await getCustomerById(id, businessId);
    if (!customer) return reply.status(404).send({ error: 'Cliente no encontrado' });
    reply.send({ data: customer });
  });

  // Staff/Admin: buscar cliente por código de tarjeta (para registrar visita)
  app.get('/by-code/:code', { preHandler: [requireStaff] }, async (request, reply) => {
    const { code } = request.params as { code: string };
    const { businessId } = request.user;
    if (!businessId) return reply.status(400).send({ error: 'businessId requerido' });
    const customer = await getCustomerByCode(code, businessId);
    if (!customer) return reply.status(404).send({ error: 'Cliente no encontrado' });
    reply.send({ data: customer });
  });
}
