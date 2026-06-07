import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { loginBusinessAdmin, loginStaff, loginSuperAdmin } from './auth.service.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  // Login para business admin y staff (misma ruta, diferente rol)
  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Email o password inválidos' });
    }

    const { email, password } = body.data;

    // Intentar business admin primero, luego staff
    const payload = (await loginBusinessAdmin(email, password)) ?? (await loginStaff(email, password));

    if (!payload) {
      return reply.status(401).send({ error: 'Credenciales incorrectas' });
    }

    const token = app.jwt.sign(payload);
    return reply.send({ token, user: payload });
  });

  // Login dedicado para super admin
  app.post('/super/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Email o password inválidos' });
    }

    const payload = await loginSuperAdmin(body.data.email, body.data.password);
    if (!payload) {
      return reply.status(401).send({ error: 'Credenciales incorrectas' });
    }

    const token = app.jwt.sign(payload);
    return reply.send({ token, user: payload });
  });

  // Verificar token y obtener usuario actual
  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    return reply.send({ user: request.user });
  });
}
