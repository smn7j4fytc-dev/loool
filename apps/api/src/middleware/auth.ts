import type { FastifyRequest, FastifyReply } from 'fastify';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      role: 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'STAFF';
      businessId?: string;
    };
    user: {
      sub: string;
      email: string;
      role: 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'STAFF';
      businessId?: string;
    };
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'No autorizado' });
  }
}

export async function requireBusinessAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const { role } = request.user;
    if (role !== 'BUSINESS_ADMIN' && role !== 'SUPER_ADMIN') {
      reply.status(403).send({ error: 'Acceso denegado' });
    }
  } catch {
    reply.status(401).send({ error: 'No autorizado' });
  }
}

export async function requireStaff(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    const { role } = request.user;
    if (!['BUSINESS_ADMIN', 'STAFF', 'SUPER_ADMIN'].includes(role)) {
      reply.status(403).send({ error: 'Acceso denegado' });
    }
  } catch {
    reply.status(401).send({ error: 'No autorizado' });
  }
}

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
    if (request.user.role !== 'SUPER_ADMIN') {
      reply.status(403).send({ error: 'Solo super administradores' });
    }
  } catch {
    reply.status(401).send({ error: 'No autorizado' });
  }
}

// Extrae businessId del JWT y valida que el usuario pertenezca al negocio solicitado
export function assertBusiness(request: FastifyRequest, businessId: string): boolean {
  const user = request.user;
  if (user.role === 'SUPER_ADMIN') return true;
  return user.businessId === businessId;
}
