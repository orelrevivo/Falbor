<div align="center">

<br/>

```
███████╗ █████╗ ██╗     ██████╗  ██████╗ ██████╗
██╔════╝██╔══██╗██║     ██╔══██╗██╔═══██╗██╔══██╗
█████╗  ███████║██║     ██████╔╝██║   ██║██████╔╝
██╔══╝  ██╔══██║██║     ██╔══██╗██║   ██║██╔══██╗
██║     ██║  ██║███████╗██████╔╝╚██████╔╝██║  ██║
╚═╝     ╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝
```

**The platform that lets you build, deploy, and manage websites — all in one place.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat-square&logo=clerk)](https://clerk.com)
[![Neon](https://img.shields.io/badge/DB-Neon-00E5BF?style=flat-square)](https://neon.tech)
[![Supabase](https://img.shields.io/badge/Storage-Supabase-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

<br/>

[🌐 Live Site](https://falbor.xyz) · [📖 Docs](#) · [🐛 Report Bug](#) · [✨ Request Feature](#)

<br/>

</div>

---

## ✦ What is Falbor?

**Falbor** is a full-stack website-building platform where every user gets their own isolated environment — complete with a dedicated database, custom domain, AI-powered tools, file storage, and integrated third-party services.

Think of it as your own personal internet: build a site, give it a domain, connect your tools, and go live — without touching a single config file.

---

## ⚡ Features

- 🏗️ **Visual Site Builder** — drag-and-drop editor with live preview
- 🗄️ **Per-Site Databases** — every site gets its own Neon PostgreSQL instance
- 🌐 **Custom Domains** — purchase and connect domains via GoDaddy, instantly
- 🤖 **AI Integration** — built-in AI models via OpenRouter & Zai
- 💬 **Chat with Files** — upload-aware chat input powered by Supabase
- 🔐 **Auth via Clerk** — sign up, sign in, OAuth — all handled
- 💸 **Payments via PayPal** — built-in billing infrastructure
- 🔗 **Third-Party Integrations** — GitHub, Slack, Discord, Spotify, Google Drive, Vercel, and more

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [pnpm](https://pnpm.io) or npm
- Accounts on: [Neon](https://neon.tech), [Clerk](https://clerk.com), [Supabase](https://supabase.com)

### Installation

```bash
git clone https://github.com/your-username/falbor.git
cd falbor
pnpm install
cp .env.example .env.local
```

Fill in your `.env.local` (see below), then:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and you're live.

---

## 🔑 Environment Variables

Copy `.env.example` to `.env.local` and fill in the values below.

### 🗄️ Database — Neon

Every site on Falbor gets its own Neon PostgreSQL branch. You'll need both a connection URL and an API key.

```env
NEON_DATABASE_URL=           # Main Neon connection string
NEON_API_KEY=                # Neon API key (for provisioning per-site DBs)
NEON_ORG_ID=                 # Your Neon organization ID
```

### 🔐 Authentication — Clerk

Used for user sign-up, sign-in, and session management.

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
```

### 🌍 Site URL

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000   # Use https://falbor.xyz in production
```

### 🤝 OAuth & Integrations

Connect external services per user. Each requires an OAuth app registered with the provider.

```env
# GitHub
GITHUB_TOKEN=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Twitter / X
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# Slack
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# Discord
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=

# Vercel
VERCEL_ACCESS_TOKEN=
```

### 🗂️ Google Drive

Used in the file picker / attachment features.

```env
NEXT_PUBLIC_GOOGLE_DEVELOPER_KEY=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_APP_ID=
```

### 🌐 Domains — GoDaddy

Falbor lets users buy and assign custom domains directly from the dashboard.

```env
GODADDY_API_KEY=
GODADDY_API_SECRET=
```

### 🤖 AI Models

```env
ZAI_API_KEY=          # Zai AI
OPENROUTER_API_KEY=   # OpenRouter (multi-model access)
```

### 🗃️ Per-Site Storage & Chat — Supabase

Each deployed site gets Supabase for storage. Also powers the file-aware chat input.

> **Note:** The file-chat feature exists in the chat input and can be enabled, but is hidden from the public site UI by default. Chat controls live in Supabase.

```env
SUPABASE_ACCESS_TOKEN=
SUPABASE_ORG_SLUG=
```

### 💳 Payments — PayPal

Used for domain purchases and platform billing.

```env
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_ENV=production    # Set to 'sandbox' for local testing
```

---

## 🏗️ Architecture Overview

```
falbor/
├── app/                  # Next.js App Router
│   ├── (auth)/           # Clerk-protected routes
│   ├── (dashboard)/      # Builder & site management
│   └── api/              # API routes (Neon, Supabase, Vercel, etc.)
├── components/           # Shared UI components
├── lib/                  # Utilities, API clients, DB helpers
├── public/               # Static assets
└── .env.local            # Your secrets (never commit this)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | Clerk |
| Primary DB | Neon PostgreSQL |
| Per-Site DB | Neon (branching API) |
| Storage & Chat | Supabase |
| Domains | GoDaddy API |
| Deployments | Vercel |
| AI | OpenRouter + Zai |
| Payments | PayPal |
| Integrations | GitHub, Slack, Discord, Spotify, Google Drive |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

Built with ❤️ by the Falbor team · [falbor.xyz](https://falbor.xyz)
Founder of the project OrelRevivo
</div>
