/**
 * Datos de prueba para desarrollo local
 * Ejecutar: npx tsx prisma/seed.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creando datos de prueba...');

  // Super Admin
  const superAdminPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD ?? 'superadmin123', 12);
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: process.env.SUPER_ADMIN_EMAIL ?? 'admin@loyaltysaas.com' },
    create: {
      email: process.env.SUPER_ADMIN_EMAIL ?? 'admin@loyaltysaas.com',
      password: superAdminPassword,
    },
    update: {},
  });
  console.log('✅ Super admin:', superAdmin.email);

  // ── Negocio 1: Cafetería Demo ────────────────────────────────────────────
  const cafeAdminPassword = await bcrypt.hash('demo123', 12);
  const cafe = await prisma.business.upsert({
    where: { slug: 'cafeteria-demo' },
    create: {
      slug: 'cafeteria-demo',
      name: 'Cafetería Demo',
      adminEmail: 'admin@cafeteria-demo.com',
      adminPassword: cafeAdminPassword,
      cardType: 'PUNCH',
      threshold: 10,
      reward: '1 café gratis',
      pointsLabel: 'Cafés',
      primaryColor: '#7C3AED',
      secondaryColor: '#FFFFFF',
      textColor: '#FFFFFF',
      locations: [{ lat: 19.4326, lng: -99.1332, name: 'Sucursal CDMX' }],
      plan: 'STARTER',
    },
    update: {},
  });
  console.log('✅ Negocio:', cafe.name, '| URL de prueba: http://localhost:3000/r/cafeteria-demo');

  // Staff de la cafetería
  const staffPassword = await bcrypt.hash('staff123', 12);
  await prisma.staff.upsert({
    where: { email: 'staff@cafeteria-demo.com' },
    create: {
      businessId: cafe.id,
      name: 'Ana García',
      email: 'staff@cafeteria-demo.com',
      password: staffPassword,
    },
    update: {},
  });
  console.log('✅ Staff: staff@cafeteria-demo.com / staff123');

  // Clientes de la cafetería
  const cafeCustomers = [
    { name: 'María López', email: 'maria@example.com', phone: '+52 55 1234 5678', balance: 3 },
    { name: 'Carlos Pérez', email: 'carlos@example.com', phone: '+52 55 2345 6789', balance: 7 },
    { name: 'Laura Martínez', email: 'laura@example.com', balance: 10 },
    { name: 'Roberto Silva', email: 'roberto@example.com', balance: 1 },
    { name: 'Diana Torres', email: 'diana@example.com', balance: 5 },
  ];

  for (const c of cafeCustomers) {
    const existing = await prisma.customer.findUnique({
      where: { businessId_email: { businessId: cafe.id, email: c.email } },
    });
    if (!existing) {
      const customer = await prisma.customer.create({
        data: { businessId: cafe.id, ...c },
      });

      // Agregar algunas visitas históricas
      const visitCount = Math.floor(c.balance) + Math.floor(Math.random() * 3);
      for (let i = 0; i < visitCount; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        await prisma.visit.create({
          data: {
            businessId: cafe.id,
            customerId: customer.id,
            pointsEarned: 1,
            createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          },
        });
      }
    }
  }
  console.log(`✅ ${cafeCustomers.length} clientes de la cafetería`);

  // ── Negocio 2: Sushi Demo ────────────────────────────────────────────────
  const sushiPassword = await bcrypt.hash('demo123', 12);
  const sushi = await prisma.business.upsert({
    where: { slug: 'sushi-demo' },
    create: {
      slug: 'sushi-demo',
      name: 'Sushi Demo',
      adminEmail: 'admin@sushi-demo.com',
      adminPassword: sushiPassword,
      cardType: 'POINTS',
      threshold: 500,
      reward: '$100 de descuento',
      pointsLabel: 'Puntos',
      primaryColor: '#DC2626',
      secondaryColor: '#FFFFFF',
      textColor: '#FFFFFF',
      plan: 'PRO',
    },
    update: {},
  });
  console.log('✅ Negocio:', sushi.name, '| URL de prueba: http://localhost:3000/r/sushi-demo');

  // Clientes del sushi
  const sushiCustomers = [
    { name: 'Alejandro Ruiz', email: 'alejandro@example.com', balance: 250 },
    { name: 'Sofía Hernández', email: 'sofia@example.com', balance: 480 },
    { name: 'Miguel Flores', email: 'miguel@example.com', balance: 100 },
  ];

  for (const c of sushiCustomers) {
    const existing = await prisma.customer.findUnique({
      where: { businessId_email: { businessId: sushi.id, email: c.email } },
    });
    if (!existing) {
      await prisma.customer.create({
        data: { businessId: sushi.id, ...c },
      });
    }
  }
  console.log(`✅ ${sushiCustomers.length} clientes del sushi`);

  console.log('\n🎉 Seed completado!\n');
  console.log('Credenciales de acceso:');
  console.log('  Super Admin: admin@loyaltysaas.com / superadmin123');
  console.log('  Admin Cafetería: admin@cafeteria-demo.com / demo123');
  console.log('  Admin Sushi: admin@sushi-demo.com / demo123');
  console.log('  Staff Cafetería: staff@cafeteria-demo.com / staff123');
  console.log('\nURLs de prueba:');
  console.log('  Panel admin: http://localhost:3000/admin/login');
  console.log('  Landing cafetería: http://localhost:3000/r/cafeteria-demo');
  console.log('  Landing sushi: http://localhost:3000/r/sushi-demo');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
