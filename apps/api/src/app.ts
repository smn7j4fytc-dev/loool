import 'dotenv/config';
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { businessRoutes } from './modules/business/business.routes.js';
import { customerRoutes } from './modules/customer/customer.routes.js';
import { visitRoutes } from './modules/visit/visit.routes.js';
import { staffRoutes } from './modules/staff/staff.routes.js';
import { analyticsRoutes } from './modules/analytics/analytics.routes.js';
import { notificationRoutes } from './modules/notification/notification.routes.js';
import { appleWalletRoutes } from './modules/wallet/apple/apple-wallet.routes.js';

async function main() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    },
  });

  // CORS
  await app.register(cors, {
    origin: [env.WEB_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  });

  // JWT
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN as string },
  });

  // Multipart (upload de logos)
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  // Decorator para proteger rutas
  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'No autorizado', details: err });
    }
  });

  // ── Rutas ────────────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(businessRoutes, { prefix: '/api/businesses' });
  await app.register(customerRoutes, { prefix: '/api/customers' });
  await app.register(visitRoutes, { prefix: '/api/visits' });
  await app.register(staffRoutes, { prefix: '/api/staff' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.register(notificationRoutes, { prefix: '/api/notifications' });
  await app.register(appleWalletRoutes, { prefix: '/api/wallet/apple' });

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  }));

  // Mock Google Wallet preview
  app.get('/api/wallet/google/mock', async (request, reply) => {
    const { objectId } = request.query as { objectId?: string };
    return reply.type('text/html').send(`
      <html><body style="font-family:monospace;padding:2rem;background:#111;color:#7C3AED">
        <h2>Google Wallet Mock Preview</h2>
        <p>En produccion, esta URL seria "Save to Google Wallet"</p>
        <p><strong>Object ID:</strong> ${objectId ?? 'N/A'}</p>
        <p>Configura <code>GOOGLE_WALLET_MOCK=false</code> con tus credenciales reales.</p>
      </body></html>
    `);
  });

  // ── Arrancar servidor ─────────────────────────────────────────────────────────
  try {
    await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
    console.log(`API corriendo en http://localhost:${env.API_PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
