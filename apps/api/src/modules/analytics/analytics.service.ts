import { prisma } from '../../lib/prisma.js';

export async function getBusinessAnalytics(businessId: string) {
  const now = new Date();
  const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOf7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalCustomers,
    newCustomersLast30,
    totalVisits,
    visitsLast30,
    rewardsGiven,
    rewardsLast30,
    visitsByDay,
    topCustomers,
  ] = await Promise.all([
    prisma.customer.count({ where: { businessId } }),
    prisma.customer.count({ where: { businessId, createdAt: { gte: startOf30Days } } }),
    prisma.visit.count({ where: { businessId } }),
    prisma.visit.count({ where: { businessId, createdAt: { gte: startOf30Days } } }),
    prisma.visit.count({ where: { businessId, rewardGiven: true } }),
    prisma.visit.count({ where: { businessId, rewardGiven: true, createdAt: { gte: startOf30Days } } }),
    // Visitas por día en los últimos 30 días
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as count
      FROM "Visit"
      WHERE "businessId" = ${businessId}
        AND "createdAt" >= ${startOf30Days}
      GROUP BY day
      ORDER BY day ASC
    `,
    // Top 5 clientes más activos
    prisma.customer.findMany({
      where: { businessId },
      select: { id: true, name: true, email: true, totalVisits: true, totalRewards: true, balance: true },
      orderBy: { totalVisits: 'desc' },
      take: 5,
    }),
  ]);

  // Clientes activos (con al menos 1 visita en los últimos 7 días)
  const activeCustomers = await prisma.customer.count({
    where: {
      businessId,
      visits: { some: { createdAt: { gte: startOf7Days } } },
    },
  });

  const redemptionRate = totalVisits > 0 ? (rewardsGiven / totalVisits) * 100 : 0;

  return {
    totalCustomers,
    newCustomersLast30,
    totalVisits,
    visitsLast30,
    rewardsGiven,
    rewardsLast30,
    activeCustomers,
    inactiveCustomers: totalCustomers - activeCustomers,
    redemptionRate: Math.round(redemptionRate * 10) / 10,
    visitsByDay: visitsByDay.map(row => ({
      day: row.day.toISOString().split('T')[0],
      count: Number(row.count),
    })),
    topCustomers,
  };
}
