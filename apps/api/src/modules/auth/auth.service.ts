import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';

export async function loginBusinessAdmin(email: string, password: string) {
  const business = await prisma.business.findUnique({ where: { adminEmail: email } });
  if (!business) return null;
  const valid = await bcrypt.compare(password, business.adminPassword);
  if (!valid) return null;
  return {
    sub: business.id,
    email: business.adminEmail,
    role: 'BUSINESS_ADMIN' as const,
    businessId: business.id,
  };
}

export async function loginStaff(email: string, password: string) {
  const staff = await prisma.staff.findUnique({ where: { email } });
  if (!staff || !staff.active) return null;
  const valid = await bcrypt.compare(password, staff.password);
  if (!valid) return null;
  return {
    sub: staff.id,
    email: staff.email,
    role: 'STAFF' as const,
    businessId: staff.businessId,
  };
}

export async function loginSuperAdmin(email: string, password: string) {
  const admin = await prisma.superAdmin.findUnique({ where: { email } });
  if (!admin) return null;
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return null;
  return {
    sub: admin.id,
    email: admin.email,
    role: 'SUPER_ADMIN' as const,
  };
}
