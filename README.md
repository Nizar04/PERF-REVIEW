# 🏆 PerfReview — Performance Review Platform

Une plateforme SaaS RH moderne pour la gestion des entretiens annuels, campagnes d'évaluation et plans de développement.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

---

## 📋 Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation rapide](#installation-rapide)
- [Configuration](#configuration)
- [Déploiement](#déploiement)
- [Structure du projet](#structure-du-projet)
- [Rôles et permissions](#rôles-et-permissions)
- [Workflow métier](#workflow-métier)

---

## ✨ Fonctionnalités

| Module | Description |
|--------|-------------|
| 🔐 Authentification | Login/SSO Google & Microsoft, RBAC |
| 📢 Campagnes | Création, activation, suivi des campagnes |
| ✍️ Autoévaluation | Formulaire collaborateur avec brouillon |
| 👔 Évaluation manager | Notation compétences + commentaires |
| ✅ Validation RH | Workflow de calibration et validation |
| 🎯 Objectifs SMART | CRUD objectifs avec KPI et pondération |
| 📊 Reporting | Dashboards analytics, exports |
| 🔔 Notifications | Temps réel, historique |
| 👥 Admin utilisateurs | Gestion rôles, invitations |

---

## 🛠 Stack technique

```
Frontend:    Next.js 15 · React 18 · TypeScript · Tailwind CSS · ShadCN UI
Backend:     tRPC · Next.js API Routes · Zod validation
ORM:         Prisma · PostgreSQL
Auth:        NextAuth v5 · OAuth (Google, Microsoft)
Charts:      Recharts
Infra:       Docker · Vercel · Supabase
```

---

## ✅ Prérequis

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (ou Supabase)
- Compte Google Cloud (OAuth) et/ou Azure AD

---

## 🚀 Installation rapide

### 1. Cloner le repo

```bash
git clone https://github.com/your-org/perfreview.git
cd perfreview
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer l'environnement

```bash
cp .env.example .env.local
# Éditez .env.local avec vos valeurs
```

Variables minimales requises :
```env
DATABASE_URL="postgresql://user:password@localhost:5432/perfreview"
NEXTAUTH_SECRET="votre-secret-32-chars-min"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Démarrer PostgreSQL avec Docker

```bash
docker compose up postgres -d
```

### 5. Migrations et seed

```bash
# Appliquer les migrations
npx prisma migrate dev

# Injecter les données de démo
npx prisma db seed
```

### 6. Lancer l'application

```bash
npm run dev
# → http://localhost:3000
```

### Comptes de démo

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@demo.com | Demo1234! |
| RH | rh@demo.com | Demo1234! |
| Manager | manager.tech@demo.com | Demo1234! |
| Collaborateur | dev1@demo.com | Demo1234! |

---

## ⚙️ Configuration complète

### Variables d'environnement

```env
# ─── Base de données ─────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@host:5432/perfreview"

# ─── NextAuth ────────────────────────────────────────────────────────────────
NEXTAUTH_SECRET="openssl rand -base64 32"
NEXTAUTH_URL="https://votre-domaine.com"

# ─── OAuth Google ────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"

# ─── OAuth Microsoft (Azure AD) ──────────────────────────────────────────────
AZURE_AD_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
AZURE_AD_CLIENT_SECRET="xxx"
AZURE_AD_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# ─── Email (Resend ou SMTP) ──────────────────────────────────────────────────
RESEND_API_KEY="re_xxx"
EMAIL_FROM="noreply@votre-domaine.com"

# ─── Redis (notifications / rate limiting) ───────────────────────────────────
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxx"
```

### OAuth Google — Configuration

1. Allez sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créez un projet → **APIs & Services** → **Credentials**
3. **Create OAuth 2.0 Client ID** → Web Application
4. Authorized redirect URIs : `https://votre-domaine.com/api/auth/callback/google`

### OAuth Microsoft — Configuration

1. Allez sur [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory** → **App registrations** → **New registration**
3. Redirect URI : `https://votre-domaine.com/api/auth/callback/azure-ad`
4. Copiez Client ID, créez un secret

---

## 🌐 Déploiement

### Option A : Vercel + Supabase (recommandé)

```bash
# 1. Créer un projet Supabase → récupérer DATABASE_URL

# 2. Installer Vercel CLI
npm i -g vercel

# 3. Déployer
vercel --prod

# 4. Configurer les env vars dans le dashboard Vercel

# 5. Migrations en production
DATABASE_URL="..." npx prisma migrate deploy
```

### Option B : Docker auto-hébergé

```bash
# Build et démarrage complet
docker compose up --build -d

# Migrations
docker compose exec app npx prisma migrate deploy

# Seed (première fois)
docker compose exec app npx prisma db seed

# Logs
docker compose logs -f app
```

### Option C : Railway

```bash
# 1. railway login
# 2. railway init
# 3. railway add postgresql
# 4. railway up
```

---

## 📁 Structure du projet

```
perfreview/
├── prisma/
│   ├── schema.prisma          # Modèles de données
│   ├── migrations/            # Historique migrations
│   └── seed.ts                # Données de démo
│
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # Page de connexion
│   │   ├── (dashboard)/       # Layout principal
│   │   │   ├── dashboard/     # Tableau de bord
│   │   │   ├── campaigns/     # Gestion campagnes
│   │   │   ├── evaluations/   # Évaluations
│   │   │   ├── objectives/    # Objectifs
│   │   │   ├── reporting/     # Analytics
│   │   │   └── admin/users/   # Admin utilisateurs
│   │   └── api/               # Next.js API routes
│   │
│   ├── components/
│   │   ├── ui/                # ShadCN components
│   │   ├── layout/            # Sidebar, Header
│   │   ├── shared/            # DataTable, StatusBadge
│   │   └── dashboard/         # StatsCard
│   │
│   ├── hooks/                 # useCurrentUser, useNotifications
│   ├── lib/                   # auth, prisma, trpc, utils, validations
│   ├── server/
│   │   ├── routers/           # tRPC routers
│   │   └── services/          # Business logic
│   └── types/                 # TypeScript types
│
├── .github/workflows/         # CI/CD
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## 👥 Rôles et permissions

| Permission | Collaborateur | Manager | RH | Admin |
|------------|:---:|:---:|:---:|:---:|
| Voir son tableau de bord | ✅ | ✅ | ✅ | ✅ |
| Compléter autoévaluation | ✅ | ✅ | ✅ | ✅ |
| Voir évaluation équipe | — | ✅ | ✅ | ✅ |
| Évaluer l'équipe | — | ✅ | ✅ | ✅ |
| Créer/activer campagne | — | — | ✅ | ✅ |
| Valider évaluations | — | — | ✅ | ✅ |
| Accès reporting | — | partiel | ✅ | ✅ |
| Gérer utilisateurs | — | — | — | ✅ |

---

## 🔄 Workflow métier

```
RH active campagne
    ↓
Notification → Collaborateurs
    ↓
[NOT_STARTED] → Collaborateur ouvre formulaire
    ↓
[SELF_IN_PROGRESS] → Sauvegarde brouillon
    ↓
[SELF_SUBMITTED] → Notification → Manager
    ↓
[MANAGER_IN_PROGRESS] → Manager évalue
    ↓
[MANAGER_SUBMITTED] → Notification → RH
    ↓
[HR_REVIEW] → RH valide / renvoie / calibre
    ↓
[CALIBRATION] (optionnel)
    ↓
[VALIDATED] → Notification → Collaborateur + Manager
    ↓
[SIGNED] → Signature électronique
    ↓
[CLOSED] → Archivage
```

---

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## 📝 Scripts npm

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run start        # Start prod server
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm test             # Jest tests
npx prisma studio    # DB GUI
npx prisma migrate dev --name <nom>  # Nouvelle migration
```

---

## 🔒 Sécurité

- **RBAC** : Middleware vérifie rôle à chaque route
- **Validation Zod** : Toutes les entrées validées côté serveur
- **Rate limiting** : Via Upstash Redis sur API auth
- **Audit logs** : Toutes les actions critiques tracées
- **RGPD** : Soft delete, données anonymisables
- **HTTPS** : Enforced en production via Vercel/reverse proxy
- **CSP** : Content-Security-Policy configuré dans next.config.ts

---

## 📄 Licence

MIT — © 2025 PerfReview

---

*Généré avec ❤️ — Stack: Next.js 15 · tRPC · Prisma · PostgreSQL · NextAuth v5*
