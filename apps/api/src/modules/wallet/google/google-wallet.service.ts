/**
 * Google Wallet Service
 *
 * Implementa la integración con Google Wallet Objects API (Loyalty).
 *
 * Flujo:
 * 1. createOrUpdateClass()  ← al configurar el negocio
 * 2. createObject()         ← al registrar un nuevo cliente
 * 3. generateSaveUrl()      ← devuelve la URL "Save to Google Wallet"
 * 4. patchObject()          ← al registrar una visita (actualiza balance)
 *
 * Modo mock (GOOGLE_WALLET_MOCK=true):
 *   - No llama a la API de Google
 *   - Devuelve URLs de prueba locales
 *   - Loguea el payload que se enviaría
 *
 * 🔑 CREDENCIALES REALES:
 *   Configura en .env:
 *     GOOGLE_WALLET_MOCK=false
 *     GOOGLE_WALLET_ISSUER_ID=<tu issuer id>
 *     GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=<email de la service account>
 *     GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY=<private key del JSON>
 */

import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';

interface BusinessConfig {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  logoUrl: string | null;
  cardType: string;
  threshold: number;
  reward: string;
  pointsLabel: string;
  locations: unknown;
}

interface CustomerConfig {
  id: string;
  name: string;
  email: string;
  cardCode: string;
  balance: number;
  googleObjectId: string | null;
}

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
      private_key: env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  });
}

function getWalletClient() {
  return google.walletobjects({ version: 'v1', auth: getAuth() });
}

function classId(businessId: string) {
  return `${env.GOOGLE_WALLET_ISSUER_ID}.loyalty_${businessId}`;
}

function objectId(customerId: string) {
  return `${env.GOOGLE_WALLET_ISSUER_ID}.loyalty_customer_${customerId}`;
}

function buildLocations(raw: unknown): Array<{ latitude: number; longitude: number }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l: unknown) => typeof l === 'object' && l !== null && 'lat' in l && 'lng' in l)
    .map((l: { lat: number; lng: number }) => ({ latitude: l.lat, longitude: l.lng }));
}

function buildClassPayload(b: BusinessConfig) {
  const cid = classId(b.id);
  const payload: Record<string, unknown> = {
    id: cid,
    issuerName: b.name,
    programName: b.name,
    reviewStatus: 'UNDER_REVIEW',
    hexBackgroundColor: b.primaryColor,
    countryCode: 'MX',
    localizedProgramName: {
      defaultValue: { language: 'es-MX', value: b.name },
    },
    localizedIssuerName: {
      defaultValue: { language: 'es-MX', value: b.name },
    },
  };

  if (b.logoUrl) {
    payload.programLogo = {
      sourceUri: { uri: b.logoUrl },
      contentDescription: { defaultValue: { language: 'es-MX', value: `Logo ${b.name}` } },
    };
  }

  const locs = buildLocations(b.locations);
  if (locs.length > 0) {
    payload.locations = locs;
  }

  return payload;
}

function buildObjectPayload(b: BusinessConfig, c: CustomerConfig) {
  const oid = objectId(c.id);
  const cid = classId(b.id);

  const total = b.threshold;
  const current = Math.min(Math.floor(c.balance), total);
  const balanceString = `${current} / ${total} ${b.pointsLabel}`;

  const payload: Record<string, unknown> = {
    id: oid,
    classId: cid,
    state: 'ACTIVE',
    accountId: c.id,
    accountName: c.name,
    loyaltyPoints: {
      balance: { string: balanceString },
      label: b.pointsLabel,
    },
    barcode: {
      type: 'QR_CODE',
      value: c.cardCode,
      alternateText: c.cardCode,
    },
    textModulesData: [
      {
        id: 'next_reward',
        header: 'Próximo premio',
        body: b.reward,
      },
      {
        id: 'customer_email',
        header: 'Cliente',
        body: c.email,
      },
    ],
  };

  const locs = buildLocations(b.locations);
  if (locs.length > 0) {
    payload.locations = locs;
  }

  return payload;
}

// ────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ────────────────────────────────────────────────────────────────────────────

export async function createOrUpdateClass(business: BusinessConfig): Promise<string> {
  const cid = classId(business.id);

  if (env.GOOGLE_WALLET_MOCK) {
    console.log('[Google Wallet MOCK] createOrUpdateClass:', JSON.stringify(buildClassPayload(business), null, 2));
    return cid;
  }

  const walletobjects = getWalletClient();
  const payload = buildClassPayload(business);

  try {
    await walletobjects.loyaltyclass.get({ resourceId: cid });
    // Class ya existe → actualizar
    await walletobjects.loyaltyclass.update({ resourceId: cid, requestBody: payload });
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 404) {
      await walletobjects.loyaltyclass.insert({ requestBody: payload });
    } else {
      throw err;
    }
  }

  return cid;
}

export async function createObject(business: BusinessConfig, customer: CustomerConfig): Promise<string> {
  const oid = objectId(customer.id);

  if (env.GOOGLE_WALLET_MOCK) {
    console.log('[Google Wallet MOCK] createObject:', JSON.stringify(buildObjectPayload(business, customer), null, 2));
    return oid;
  }

  const walletobjects = getWalletClient();
  const payload = buildObjectPayload(business, customer);

  try {
    await walletobjects.loyaltyobject.get({ resourceId: oid });
    // Ya existe
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 404) {
      await walletobjects.loyaltyobject.insert({ requestBody: payload });
    } else {
      throw err;
    }
  }

  return oid;
}

export async function patchObject(business: BusinessConfig, customer: CustomerConfig): Promise<void> {
  const oid = objectId(customer.id);
  const total = business.threshold;
  const current = Math.min(Math.floor(customer.balance), total);
  const balanceString = `${current} / ${total} ${business.pointsLabel}`;

  if (env.GOOGLE_WALLET_MOCK) {
    console.log(`[Google Wallet MOCK] patchObject ${oid}: balance="${balanceString}"`);
    return;
  }

  const walletobjects = getWalletClient();
  await walletobjects.loyaltyobject.patch({
    resourceId: oid,
    requestBody: {
      loyaltyPoints: {
        balance: { string: balanceString },
        label: business.pointsLabel,
      },
    },
  });
}

export function generateSaveUrl(customer: CustomerConfig): string {
  const oid = objectId(customer.id);

  if (env.GOOGLE_WALLET_MOCK) {
    return `${env.API_URL}/api/wallet/google/mock?objectId=${oid}`;
  }

  const payload = {
    iss: env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.round(Date.now() / 1000),
    payload: {
      loyaltyObjects: [{ id: oid }],
    },
  };

  const token = jwt.sign(
    payload,
    env.GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
    { algorithm: 'RS256' }
  );

  return `https://pay.google.com/gp/v/save/${token}`;
}
