import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  API_PORT: z.coerce.number().default(3001),
  WEB_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:3001'),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),

  SUPER_ADMIN_EMAIL: z.string().email().default('admin@loyaltysaas.com'),
  SUPER_ADMIN_PASSWORD: z.string().min(8).default('superadmin123'),

  // Google Wallet
  GOOGLE_WALLET_MOCK: z.string().transform(v => v === 'true').default('true'),
  GOOGLE_WALLET_ISSUER_ID: z.string().default(''),
  GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: z.string().default(''),
  GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().default(''),

  // Apple Wallet
  APPLE_WALLET_MOCK: z.string().transform(v => v === 'true').default('true'),
  APPLE_PASS_TYPE_ID: z.string().default('pass.com.tuempresa.loyalty'),
  APPLE_TEAM_ID: z.string().default(''),
  APPLE_WWDR_CERT_BASE64: z.string().default(''),
  APPLE_PASS_CERT_BASE64: z.string().default(''),
  APPLE_PASS_KEY_BASE64: z.string().default(''),
  APPLE_PASS_KEY_PASSPHRASE: z.string().default(''),
  APPLE_APN_KEY_BASE64: z.string().default(''),
  APPLE_APN_KEY_ID: z.string().default(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
