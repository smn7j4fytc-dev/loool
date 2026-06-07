# Loyalty SaaS — Tarjetas de Lealtad Digitales

Plataforma multi-tenant para tarjetas de lealtad digitales compatibles con Apple Wallet y Google Wallet, sin apps nativas.

## Índice
- [Arquitectura](#arquitectura)
- [Stack](#stack)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Configuración local](#configuración-local)
- [Variables de entorno](#variables-de-entorno)
- [Obtener credenciales de Google Wallet](#obtener-credenciales-de-google-wallet)
- [Obtener credenciales de Apple Wallet](#obtener-credenciales-de-apple-wallet)
- [Flujo de desarrollo](#flujo-de-desarrollo)
- [API Reference](#api-reference)
- [Despliegue](#despliegue)

---

## Arquitectura

```
Cliente (móvil)
    │  escanea QR maestro
    ▼
Landing /r/<slug>  ──── POST /api/customers/register ──► PostgreSQL
    │                                                           │
    │  ◄── saveToGoogleWalletUrl (JWT firmado)                  │
    │                                                     Google Wallet API
    ▼                                                      (LoyaltyObject)
Google Wallet ──────── push update ◄── POST /api/visits ◄── Staff (escanea QR cliente)
```

**Multi-tenancy**: cada negocio tiene su propio `businessId`. Todos los queries filtran por él. Un negocio nunca ve datos de otro.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Fastify 4 + TypeScript 5 |
| ORM | Prisma 5 + PostgreSQL 16 |
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Google Wallet | googleapis v140 (Wallet Objects API) |
| Apple Wallet | passkit-generator v3 + APNs (node-apn) |
| Auth | JWT via @fastify/jwt |
| QR | qrcode |
| Validación | Zod |

---

## Estructura del proyecto

```
loyalty-saas/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── schema.prisma          ← Modelo de datos completo
│   │   │   └── seed.ts                ← Datos de prueba (2 negocios, clientes)
│   │   └── src/
│   │       ├── app.ts                 ← Entry point Fastify
│   │       ├── config/env.ts          ← Variables de entorno (Zod validation)
│   │       ├── lib/prisma.ts          ← Cliente Prisma singleton
│   │       ├── middleware/auth.ts     ← Decorators JWT por rol
│   │       └── modules/
│   │           ├── auth/              ← Login (admin, staff, super)
│   │           ├── business/          ← Config de negocio + Google Wallet Class
│   │           ├── customer/          ← Registro público + consulta por código
│   │           ├── visit/             ← Stamp/punch + wallet push update
│   │           ├── staff/             ← CRUD empleados
│   │           ├── analytics/         ← Stats por negocio
│   │           ├── notification/      ← Campañas push
│   │           ├── qr/               ← Generación de QR codes
│   │           └── wallet/
│   │               ├── google/        ← Google Wallet API (Class + Object + JWT)
│   │               └── apple/         ← Apple Wallet (.pkpass + PassKit web service)
│   └── web/
│       ├── app/
│       │   ├── r/[slug]/              ← 🌐 Landing pública de registro por negocio
│       │   ├── admin/                 ← 🔒 Panel admin del negocio
│       │   ├── staff/                 ← 📷 Pantalla de staff (scanner QR)
│       │   └── super/                 ← 👑 Super admin (todos los negocios)
│       ├── components/
│       └── lib/
├── .env.example
├── .gitignore
└── package.json
```

---

## Configuración local

### Prerrequisitos
- Node.js 20+
- PostgreSQL 14+ (o Docker)
- npm 10+

### 1. Clonar e instalar dependencias

```bash
git clone <repo>
cd loyalty-saas
npm install
```

### 2. Base de datos con Docker (recomendado)

```bash
docker run --name loyalty-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=loyalty_saas \
  -p 5432:5432 \
  -d postgres:16
```

### 3. Variables de entorno

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# Editar con tus valores
```

### 4. Migraciones y datos de prueba

```bash
cd apps/api
npx prisma db push          # Crea tablas
npx tsx prisma/seed.ts      # Datos de prueba
```

### 5. Arrancar el proyecto

```bash
# En la raíz
npm run dev

# O por separado:
npm run dev:api   # API en http://localhost:3001
npm run dev:web   # Web en http://localhost:3000
```

### Usuarios de prueba (seed)

| Email | Password | Rol | Negocio |
|-------|----------|-----|---------|
| admin@loyaltysaas.com | superadmin123 | Super Admin | — |
| admin@cafeteria-demo.com | demo123 | Business Admin | Cafetería Demo |
| admin@sushi-demo.com | demo123 | Business Admin | Sushi Demo |
| staff@cafeteria-demo.com | staff123 | Staff | Cafetería Demo |

Panel admin: http://localhost:3000/admin/login
Landing de prueba: http://localhost:3000/r/cafeteria-demo

---

## Variables de entorno

```bash
# Base de datos
DATABASE_URL="postgresql://postgres:password@localhost:5432/loyalty_saas"

# JWT
JWT_SECRET="cambia-esto-en-produccion"
JWT_EXPIRES_IN="7d"

# URLs
API_PORT=3001
WEB_URL="http://localhost:3000"
API_URL="http://localhost:3001"

# 🔑 CREDENCIALES REALES — Google Wallet
# Mientras GOOGLE_WALLET_MOCK=true, devuelve URLs de prueba locales
GOOGLE_WALLET_MOCK=true
GOOGLE_WALLET_ISSUER_ID=""
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=""
GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY=""

# 🔑 CREDENCIALES REALES — Apple Wallet
# Mientras APPLE_WALLET_MOCK=true, genera pkpass firmado con certs de prueba
APPLE_WALLET_MOCK=true
APPLE_PASS_TYPE_ID="pass.com.tuempresa.loyalty"
APPLE_TEAM_ID=""
APPLE_WWDR_CERT_BASE64=""
APPLE_PASS_CERT_BASE64=""
APPLE_PASS_KEY_BASE64=""
APPLE_PASS_KEY_PASSPHRASE=""
APPLE_APN_KEY_BASE64=""
APPLE_APN_KEY_ID=""
```

---

## Obtener credenciales de Google Wallet

### Paso 1: Habilitar la Google Wallet API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto nuevo o selecciona uno existente
3. En el menú lateral: **APIs & Services → Library**
4. Busca "Google Wallet API" y haz clic en **Enable**

### Paso 2: Crear una Service Account

1. Ve a **IAM & Admin → Service Accounts**
2. Clic en **+ Create Service Account**
   - Name: `loyalty-wallet-sa`
   - ID: `loyalty-wallet-sa`
3. Clic en **Create and Continue**
4. En el paso de permisos, asigna el rol: **Wallet Objects Editor** (si no aparece, busca "Wallet")
5. Clic en **Done**
6. Haz clic en la service account creada → pestaña **Keys**
7. **Add Key → Create new key → JSON** → descarga el archivo

### Paso 3: Configurar el Issuer en Google Pay & Wallet Console

1. Ve a [Google Pay & Wallet Console](https://pay.google.com/business/console)
2. Inicia sesión con tu cuenta de Google
3. Ve a **Google Wallet API** en el menú lateral
4. Completa el formulario de registro como **Issuer**
5. Una vez aprobado, obtienes tu **Issuer ID** (número de ~15 dígitos)

### Paso 4: Autorizar la Service Account

1. En la Wallet Console → **Google Wallet API → Service Accounts**
2. Agrega el email de tu service account
3. Asigna el rol: **Wallet Objects Editor**

### Paso 5: Configurar en .env

Abre el JSON descargado en el Paso 2 y extrae:
```bash
GOOGLE_WALLET_ISSUER_ID="3388000000012345678"  # Del paso 3
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL="loyalty-wallet-sa@tu-proyecto.iam.gserviceaccount.com"
GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
# La private_key del JSON tiene \n literales; cópiala tal cual
GOOGLE_WALLET_MOCK=false  # ← Cambia esto cuando tengas las credenciales
```

---

## Obtener credenciales de Apple Wallet

> **Requiere Apple Developer Program** ($99/año en developer.apple.com)

### Paso 1: Crear un Pass Type ID

1. Ve a [Apple Developer → Certificates, IDs & Profiles](https://developer.apple.com/account/resources/identifiers/list/passTypeId)
2. Selecciona **Identifiers → Pass Type IDs** (o usa el `+` y filtra por Pass Type)
3. Clic en **+** → selecciona **Pass Type IDs**
4. Description: "Loyalty Pass" | ID: `pass.com.tuempresa.loyalty`
5. Guarda tu **Team ID** (visible arriba a la derecha en la cuenta)

### Paso 2: Crear el certificado del Pass Type ID

1. En la lista de identifiers, clic en tu Pass Type ID
2. Clic en **Create Certificate**
3. Genera un CSR en tu Mac:
   ```bash
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout passkey.pem \
     -out pass.csr \
     -subj "/emailAddress=tu@email.com/CN=Pass Cert/C=MX"
   ```
4. Sube el `.csr` y descarga el certificado (`.cer`)
5. Conviértelo a `.pem`:
   ```bash
   openssl x509 -in pass.cer -inform DER -out passcert.pem
   ```

### Paso 3: Descargar el WWDR Intermediate Certificate

```bash
curl -O https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer
openssl x509 -in AppleWWDRCAG4.cer -inform DER -out wwdr.pem
```

### Paso 4: Crear la APNs Key

1. En Apple Developer → **Certificates, IDs & Profiles → Keys**
2. Clic en **+** → marca **Apple Push Notifications service (APNs)**
3. Descarga el archivo `.p8`
4. Anota el **Key ID**

### Paso 5: Configurar en .env

```bash
APPLE_PASS_TYPE_ID="pass.com.tuempresa.loyalty"
APPLE_TEAM_ID="ABCDE12345"
APPLE_WWDR_CERT_BASE64=$(base64 -w 0 wwdr.pem)
APPLE_PASS_CERT_BASE64=$(base64 -w 0 passcert.pem)
APPLE_PASS_KEY_BASE64=$(base64 -w 0 passkey.pem)
APPLE_PASS_KEY_PASSPHRASE=""  # Si pusiste passphrase al generar el CSR
APPLE_APN_KEY_BASE64=$(base64 -w 0 AuthKey_XXXXX.p8)
APPLE_APN_KEY_ID="XXXXX"
APPLE_WALLET_MOCK=false  # ← Cambia esto cuando tengas los certificados
```

---

## Flujo de desarrollo (sin credenciales reales)

Con `GOOGLE_WALLET_MOCK=true`:
- El registro de clientes genera una URL de prueba local: `/api/wallet/google/mock?objectId=...`
- Esta URL muestra los datos que se enviarían a Google Wallet
- Todo el resto del flujo (visitas, analytics, staff) funciona igual

---

## API Reference

Ver colección Postman/Bruno en `docs/api.http` (generada automáticamente por Fastify).

Endpoints principales:
```
POST   /api/auth/login                       Login (admin/staff)
POST   /api/auth/super/login                 Login super admin
POST   /api/businesses                       Crear negocio (super admin)
GET    /api/businesses/:id                   Ver negocio (admin)
PATCH  /api/businesses/:id                   Actualizar config
POST   /api/businesses/:id/wallet/setup      Crear LoyaltyClass en Google
GET    /api/businesses/:id/qr                QR maestro de registro
POST   /api/customers/register               Registro público de cliente
GET    /api/customers                        Listar clientes del negocio
GET    /api/customers/by-code/:code          Buscar por código (staff)
POST   /api/visits                           Registrar visita (staff)
GET    /api/analytics                        Stats del negocio
POST   /api/notifications                    Enviar campaña push
POST   /api/staff                            Crear empleado
```

---

## Despliegue

### Railway (recomendado para empezar)

```bash
# Instala Railway CLI
npm install -g @railway/cli
railway login

# Deploya la API
cd apps/api
railway init
railway up

# Agrega PostgreSQL
railway add postgresql

# Variables de entorno en Railway dashboard
```

### Variables adicionales para producción
```bash
NODE_ENV=production
WEB_URL=https://tu-dominio.com
API_URL=https://api.tu-dominio.com
```
