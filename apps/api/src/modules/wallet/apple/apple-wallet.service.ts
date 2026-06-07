/**
 * Apple Wallet Service
 *
 * Genera .pkpass y maneja APNs push para actualización en tiempo real.
 *
 * 🔑 CREDENCIALES REALES (en .env):
 *   APPLE_WALLET_MOCK=false
 *   APPLE_PASS_TYPE_ID=pass.com.tuempresa.loyalty
 *   APPLE_TEAM_ID=ABCDE12345
 *   APPLE_WWDR_CERT_BASE64=<base64 del wwdr.pem>
 *   APPLE_PASS_CERT_BASE64=<base64 del passcert.pem>
 *   APPLE_PASS_KEY_BASE64=<base64 del passkey.pem>
 *   APPLE_PASS_KEY_PASSPHRASE=<tu passphrase si la pusiste>
 *   APPLE_APN_KEY_BASE64=<base64 del AuthKey_XXXXX.p8>
 *   APPLE_APN_KEY_ID=XXXXX
 *
 * Ver README.md para guía paso a paso de cómo obtener estos certificados.
 *
 * Mientras APPLE_WALLET_MOCK=true:
 *   - createApplePass() → devuelve una URL de mock (no hay .pkpass real)
 *   - pushAppleUpdate() → solo loguea, no llama a APNs
 */

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
}

interface CustomerConfig {
  id: string;
  name: string;
  email: string;
  cardCode: string;
  balance: number;
  applePassSerial: string | null;
  appleAuthToken: string | null;
}

interface AppleDevice {
  pushToken: string;
  passTypeIdentifier: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Crear o actualizar un .pkpass
// ────────────────────────────────────────────────────────────────────────────

export async function createApplePass(business: BusinessConfig, customer: CustomerConfig): Promise<string | null> {
  if (env.APPLE_WALLET_MOCK) {
    console.log('[Apple Wallet MOCK] createApplePass para:', customer.email);
    return null; // No hay URL real en mock
  }

  // Con credenciales reales, descomenta y usa passkit-generator:
  //
  // import { PKPass } from 'passkit-generator';
  //
  // const pass = await PKPass.from({
  //   model: {
  //     "pass.json": Buffer.from(JSON.stringify({
  //       passTypeIdentifier: env.APPLE_PASS_TYPE_ID,
  //       teamIdentifier: env.APPLE_TEAM_ID,
  //       serialNumber: customer.id,
  //       description: `${business.name} Loyalty`,
  //       organizationName: business.name,
  //       foregroundColor: `rgb(${hexToRgb(business.textColor)})`,
  //       backgroundColor: `rgb(${hexToRgb(business.primaryColor)})`,
  //       logoText: business.name,
  //       webServiceURL: `${env.API_URL}/api/wallet/apple`,
  //       authenticationToken: customer.appleAuthToken,
  //       storeCard: {
  //         primaryFields: [{
  //           key: "balance",
  //           label: business.pointsLabel,
  //           value: `${Math.floor(customer.balance)} / ${business.threshold}`,
  //         }],
  //         backFields: [
  //           { key: "reward", label: "Premio", value: business.reward },
  //           { key: "email", label: "Cliente", value: customer.email },
  //         ],
  //       },
  //       barcodes: [{
  //         message: customer.cardCode,
  //         format: "PKBarcodeFormatQR",
  //         messageEncoding: "iso-8859-1",
  //       }],
  //     })),
  //   },
  //   certificates: {
  //     wwdr: Buffer.from(env.APPLE_WWDR_CERT_BASE64, 'base64'),
  //     signerCert: Buffer.from(env.APPLE_PASS_CERT_BASE64, 'base64'),
  //     signerKey: Buffer.from(env.APPLE_PASS_KEY_BASE64, 'base64'),
  //     signerKeyPassphrase: env.APPLE_PASS_KEY_PASSPHRASE || undefined,
  //   },
  // }, {
  //   serialNumber: customer.id,
  // });
  //
  // const pkpassBuffer = await pass.getAsBuffer();
  // // Aquí guardarías el buffer o lo devolverías como download
  // // Para updates: guardar el serial en DB y el authToken

  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Push update via APNs
// ────────────────────────────────────────────────────────────────────────────

export async function pushAppleUpdate(
  customer: CustomerConfig,
  devices: AppleDevice[]
): Promise<void> {
  if (env.APPLE_WALLET_MOCK) {
    console.log(`[Apple Wallet MOCK] pushAppleUpdate para ${customer.email}, ${devices.length} dispositivos`);
    return;
  }

  // Con credenciales reales, descomenta:
  //
  // import apn from 'node-apn';
  //
  // const provider = new apn.Provider({
  //   token: {
  //     key: Buffer.from(env.APPLE_APN_KEY_BASE64, 'base64'),
  //     keyId: env.APPLE_APN_KEY_ID,
  //     teamId: env.APPLE_TEAM_ID,
  //   },
  //   production: env.NODE_ENV === 'production',
  // });
  //
  // await Promise.all(devices.map(async device => {
  //   const notification = new apn.Notification();
  //   notification.topic = device.passTypeIdentifier;
  //   notification.payload = {};
  //   await provider.send(notification, device.pushToken);
  // }));
  //
  // provider.shutdown();
}
