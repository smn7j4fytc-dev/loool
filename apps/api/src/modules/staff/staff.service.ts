import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';

export async function getStaff(businessId: string) {
  return prisma.staff.findMany({
    where: { businessId },
    select: { id: true, name: true, email: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createStaff(businessId: string, name: string, email: string, password: string) {
  const hashed = await bcrypt.hash(password, 12);
  return prisma.staff.create({
    data: { businessId, name, email, password: hashed },
    select: { id: true, name: true, email: true, active: true, createdAt: true },
  });
}

export async function toggleStaff(id: string, businessId: string) {
  const staff = await prisma.staff.findFirst({ where: { id, businessId } });
  if (!staff) throw new Error('NOT_FOUND');
  return prisma.staff.update({
    where: { id },
    data: { active: !staff.active },
    select: { id: true, name: true, active: true },
  });
}

export async function deleteStaff(id: string, businessId: string) {
  const staff = await prisma.staff.findFirst({ where: { id, businessId } });
  if (!staff) throw new Error('NOT_FOUND');
  return prisma.staff.delete({ where: { id } });
}
