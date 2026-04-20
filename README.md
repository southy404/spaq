<p align="center">
  <img src="client/public/spaq-logo-darkmode.png" alt="SPAQ Logo" width="220" />
</p>

<h1 align="center">SPAQ</h1>

<p align="center">
  Modern fitness tracking platform with athlete and coach roles, onboarding-driven setup, real-time chat, metric sharing, and an AI-ready foundation.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React_18-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Realtime-Socket.io-010101?style=for-the-badge&logo=socket.io" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-success?style=flat" />
  <img src="https://img.shields.io/badge/version-0.1.0-blue?style=flat" />
  <img src="https://img.shields.io/badge/deployment-live-brightgreen?style=flat" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat" />
</p>

---

## Live Demo

🌐 **https://spaq-drab.vercel.app**

> Note: Backend is hosted separately. Some real-time features may depend on server availability.

---

## Overview

SPAQ is a modular fitness app built around two roles:

- **Athletes** track health and performance metrics in a flexible dashboard
- **Coaches** monitor connected athletes, review shared metrics, and communicate in real time

The app includes:

- structured athlete onboarding
- dashboard auto-setup from onboarding
- persistent athlete card arrangement
- coach-side personal card arrangement
- real-time chat and connection workflows
- AI-ready profile + stats context for future smart coaching features
- mobile-connect groundwork for smartwatch / Health Connect style syncing later

---

## Stack

### Frontend

- React 18
- Vite
- TypeScript
- TailwindCSS v4
- TanStack Query
- Recharts
- dnd-kit

### Backend

- Node.js
- Express
- TypeScript
- Mongoose
- Socket.io

### Database

- MongoDB Atlas

### Auth

- JWT
- bcrypt

### Validation

- Zod shared between client and server

---

## Core Features

### Athlete dashboard

- modular stat cards
- add / edit / delete cards
- reorder cards with drag and drop
- persistent card order stored in backend
- latest values + day-specific values
- chart visualization for selected metrics
- weight updates with manual delta control
- custom metrics and entry logging

### Coach dashboard

- linked athlete overview
- active/inactive athlete indicators by selected time range
- coach-side metric card arrangement
- local personalized card order per athlete
- visual progress review across flexible time ranges
- shared metric access control

### Athlete ↔ Coach system

- connect request flow
- accept / decline requests
- metric permission updates
- relation-based access control

### Real-time chat

- athlete ↔ coach messaging
- unread tracking
- chat sidebar + thread view
- in-chat request handling
- notification-style chat updates

### Onboarding

- athlete onboarding required after first login
- onboarding-aware auth redirects
- profile creation from onboarding
- auto-generated starter cards
- initial weight automatically seeded into stats
- onboarding data stored as reusable athlete profile context

### AI (Current State)

The system is prepared for AI features with a structured pipeline already in place:

- athlete context generation
- enriched profile + stats pipeline ready for inference

Current state:
- local-first Ollama integration planned
- fallback handling required in production
- endpoints exist but are not fully active in deployed environments

### Mobile / sync direction

- mobile connect modal
- groundwork for future smartwatch / Health Connect / Google Fit style integrations
- onboarding hints for later automatic sync instead of manual-only tracking

---

## Current Product Behavior

### Athlete flow

1. Register as athlete
2. Login
3. If onboarding is incomplete, redirect to `/onboarding`
4. Complete onboarding
5. Profile is stored
6. Starter cards are created automatically depending on onboarding choices
7. Initial weight is stored as the first weight entry
8. Athlete lands on dashboard and can immediately edit, delete, reorder, or extend cards

### Coach flow

1. Register/login as coach
2. Open coach dashboard
3. View linked athletes
4. Review shared metrics
5. Arrange dashboard cards locally per athlete
6. Use chat for communication and request handling

---

## Setup

### 1. Install dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 2. Configure environment

Create `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/fitnessapp?retryWrites=true&w=majority
JWT_SECRET=your_long_random_secret
NODE_ENV=development
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Seed the database (optional but recommended)

```bash
cd server && npm run seed
```

This creates two demo accounts:

- **Athlete** — `athlete@demo.com` / `password123`
- **Athlete** — `dirk@demo.com` / `password123` *(pre-filled with sample data)*
- **Coach** — `coach@demo.com` / `password123`

### 4. Run the app

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open http://localhost:5173

---

## Deployment

### Frontend (Vercel)

The frontend is deployed on Vercel.

Important:
- SPA routing is handled via `vercel.json` rewrites
- All routes fall back to `index.html`

### Backend (Self-hosted)

The backend runs on a Linux server:

- Node.js (ts-node-dev or production build)
- MongoDB Atlas
- Socket.io (WebSocket support required on the host)

### Environment (Production)

`client/.env`:

```env
VITE_API_URL=https://<your-api-domain>/api
```

`server/.env`:

```env
PORT=5000
MONGODB_URI=...
JWT_SECRET=...
NODE_ENV=production
```

---

## Known Issues

- WebSocket connection may fail if the reverse proxy is not configured for WebSocket upgrades (e.g. missing Nginx `Upgrade` headers)
- AI endpoints require a local Ollama instance or fallback configuration — not active in the current deployment
- Location reverse geocoding may return 502 depending on external API availability
- Rapid page reloads previously caused 404 errors — fixed via Vercel `vercel.json` rewrites

---

## Realtime (Socket.io)

- used for chat updates and notifications
- requires proper WebSocket proxy setup in production (e.g. Nginx with `Upgrade` and `Connection` headers)

> Note: Real-time features may be degraded if WebSocket upgrade is not configured on the server host.

---

## Project Structure

```
SPAQ/
├── client/
│   └── src/
│       ├── components/
│       │   ├── auth/         # mobile connect modal
│       │   ├── cards/        # stat cards, edit/delete/logging UI
│       │   ├── chart/        # chart components
│       │   ├── chat/         # chat sidebar, window, notifier
│       │   ├── layout/       # layout widgets
│       │   └── ui/           # motivation bot and dashboard helpers
│       ├── hooks/            # auth, stats, coach, unread chat hooks
│       ├── lib/              # API client, socket
│       ├── pages/
│       │   ├── athlete/      # athlete dashboard, coaches page
│       │   ├── coach/        # coach dashboard
│       │   ├── chat/         # chat page
│       │   ├── onboarding/   # onboarding flow
│       │   ├── LoginPage.tsx
│       │   └── RegisterPage.tsx
│       └── types/
│
├── server/
│   └── src/
│       ├── ai/               # AI context builders / providers
│       ├── lib/              # db, jwt, onboarding presets
│       ├── middleware/       # auth + role guards
│       ├── models/
│       │   ├── User
│       │   ├── AthleteProfile
│       │   ├── CoachAthlete
│       │   ├── ChatThread
│       │   ├── ChatMessage
│       │   ├── MobileLoginToken
│       │   ├── StatCard
│       │   └── StatEntry
│       ├── routes/
│       │   ├── auth
│       │   ├── athlete
│       │   ├── coach
│       │   ├── chat
│       │   ├── stats
│       │   └── ai
│       ├── socket.ts
│       └── index.ts
│
└── shared/
    └── schemas/              # shared zod schemas
```

---

## Important API Areas

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Auth response includes: user id, role, onboarding completion state.

### Athlete

- `GET /api/athlete/cards`
- `POST /api/athlete/cards`
- `PATCH /api/athlete/cards/:id`
- `DELETE /api/athlete/cards/:id`
- `PATCH /api/athlete/cards/reorder`
- `PATCH /api/athlete/weight`
- `GET /api/athlete/profile`
- `PATCH /api/athlete/profile`
- `POST /api/athlete/onboarding`

### Stats

- `POST /api/stats/entries`
- `DELETE /api/stats/entries/:id`
- `GET /api/stats/latest`
- `GET /api/stats/day?date=YYYY-MM-DD`
- `GET /api/stats/entries/:cardId`

### Coach

- athlete relation and permissions routes
- stats access for allowed metrics
- activity overview

### Chat

- threads
- messages
- request accept / decline
- unread counts
- socket events

### AI

Prepared for motivation, insights, and contextual athlete chat. Currently based on athlete profile + stats context. Not active in the deployed environment.

---

## Card Behavior

All cards, including onboarding-generated cards, are normal `StatCard` documents.

They can all be:

- edited
- deleted
- reordered
- logged manually
- visualized in charts
- used for weight updates
- shared with coaches based on permissions

There are **no special locked onboarding cards**.

---

## Reordering Logic

### Athlete

Athlete card order is stored in the backend using `StatCard.order`. This means drag & drop order survives reload and is consistent across sessions and devices.

### Coach

Coach card order is stored locally in `localStorage` per athlete. This means the coach can personalize their view, it survives reload in the same browser, but is not synced across devices and does not affect athlete card order.

---

## Onboarding Model

Athlete onboarding captures:

- current weight, target weight, height, birth date, gender
- primary goal, reason / motivation, event target
- lifestyle, activity level, experience, workouts per week
- pain points, diet preference, meal structure
- training location, equipment level, available days
- sleep quality, stress level, limitations
- AI tone, notes, preferred start mode

This data is stored in `AthleteProfile` and reused for dashboard setup, initial card generation, AI context, coaching context, and future personalization.

---

## Planned Next Steps

- local Ollama-first AI integration
- optional external provider support (e.g. Gemini)
- AI chat tab for athletes
- AI-generated motivation and insights
- smartwatch / Health Connect / Google Fit import
- mobile app connection
- richer profile editing after onboarding
- coach notes and intervention workflows
- deeper trend analysis and adherence scoring

---

## Development Notes

- athlete onboarding is part of the required auth flow
- login/register must return `onboardingCompleted`
- auth must not fail if athlete profile lookup fails

**Important:**

- `/cards/reorder` must be declared before `/cards/:id`
- `athleteId` and `cardId` are Mongo `ObjectId`s — always ensure proper casting in queries
