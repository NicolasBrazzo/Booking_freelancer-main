# Volta

Multi-tenant booking platform for solo professionals, with two-way Google Calendar sync.

Clients book through a public page; the app computes real availability by cross-referencing the professional's configured working hours against the events already in their Google Calendar, so a slot is never offered when they are busy.

> **Project status — archived.** Built as a learning project between May and September 2026. It runs, but it is not maintained and not accepting users.

---

## The problem

Hairdressers, personal trainers, and other solo professionals mostly handle bookings by hand: DMs at 11pm, a paper diary, a WhatsApp thread. The generic tools that exist (Calendly and friends) are built around a knowledge-worker's meeting, not around a service with a fixed duration and a price.

Volta is a booking page tailored to that: services with duration and price, working hours with an optional lunch break, and availability that respects whatever else is already on the professional's calendar.

---

## Features

- **Google OAuth sign-in** for the professional
- **Guided onboarding** — business details, first service, working hours
- **Service management** — name, description, duration, price
- **Availability engine** — working hours minus existing calendar events, sliced into bookable slots
- **Public booking page** at `/book/:slug`, no account required for the client
- **Two-way Google Calendar sync** — confirmed bookings are written to the professional's calendar
- **Multi-tenant** — each professional's data is isolated at the database level

---

## Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│  React + Vite   │───────▶│  Node / Express  │───────▶│    Supabase     │
│   (SPA)         │  REST  │    (API)         │        │  Postgres + RLS │
└─────────────────┘        └────────┬─────────┘        └─────────────────┘
                                    │
                                    │  OAuth 2.0
                                    ▼
                           ┌──────────────────┐
                           │ Google Calendar  │
                           │      API         │
                           └──────────────────┘
```

### The availability engine

The part of this project I find most interesting. Computing "what slots can a client book" is deceptively hard, because the answer depends on four things that all disagree with each other:

1. The professional's **working hours** — which may be split by a lunch break, and differ per weekday
2. The **service duration** — a 20-minute beard trim and a 3-hour colour treatment produce different grids
3. The **existing calendar events** — anything already booked, including things that have nothing to do with Volta
4. A **minimum notice period** — you can't book a haircut for four minutes from now

The engine builds a set of candidate slots from working hours and service duration, subtracts busy intervals pulled from Google Calendar, and filters what's left against the notice window. Timezones are the recurring source of bugs here: everything is stored in UTC and converted at the boundary, and all-day events need special handling because they have no time component to subtract.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth + Google OAuth 2.0 |
| External API | Google Calendar API |
| Hosting | Railway |

---

## Running locally

### Prerequisites

- Node.js 20+
- A Supabase project
- A Google Cloud project with the Calendar API enabled and OAuth credentials

### Setup

```bash
git clone https://github.com/NicolasBrazzo/volta
cd volta

# Backend
cd server
npm install
cp .env.example .env   # fill in the values below
npm run dev

# Frontend
cd ../client
npm install
cp .env.example .env
npm run dev
```

### Environment variables

```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# App
PORT=3000
CLIENT_URL=http://localhost:5173
```

> The Google OAuth consent screen must list `http://localhost:5173` as an authorized origin and the redirect URI above as an authorized redirect URI, or the flow fails with `redirect_uri_mismatch`.

<!-- TODO: add the SQL migrations or a link to them, otherwise nobody can actually run this -->

---

## Project structure

```
volta/
├── client/          # React SPA — landing, dashboard, public booking page
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
├── server/          # Express API
│   ├── routes/
│   ├── services/    # slot engine, Google Calendar client
│   └── middleware/
└── supabase/        # schema and migrations
```

---

## Engineering notes

Roughly 80% of the initial codebase was generated with an AI coding assistant, then reviewed and corrected by hand. That turned out to be the most instructive part of the project, so it's worth writing down what the review found.

**Row Level Security was declared but not enforced.** The generated migrations created policies on the tables but did not enable RLS on them, so the policies were inert and tenant isolation rested entirely on application-level filtering. Every endpoint looked correct in isolation; the database would happily have served another tenant's rows to a crafted request. The lesson generalises: generated infrastructure code tends to produce the *shape* of a security control without the switch that activates it.

**Concurrency was handled in application code.** Double-booking was prevented by reading the slot, checking it was free, and then writing — which is a race, not a check. The correct fix is a uniqueness constraint at the database level so that the second concurrent write fails loudly.

**Timezones needed to be tested in a non-local timezone.** Everything passed on a machine set to Europe/Rome and broke elsewhere. Running the test suite with `TZ=UTC` surfaced a class of bugs that were invisible locally.

### What I'd do differently

- **Own the source of truth.** Google Calendar was both the storage and the conflict-detection layer, which meant the core feature could not function without a third-party integration. An internal availability table with Calendar as a mirror would have been the healthier design.
- **Request narrower OAuth scopes.** `calendar.events` grants read and write access to every calendar the user owns. Reading free/busy information and delivering the appointment as a calendar invite would have covered the same use case with a far smaller permission surface — which matters both for user trust and for Google's verification process.
- **Reserve route names before allowing user-chosen slugs.** Public pages live at `/book/:slug`; shortening that to `/:slug` would have let a user register `login` or `admin`.

---

## What I learned

Multi-tenant data modelling and Postgres RLS · OAuth 2.0 authorization flows, refresh token lifecycle, and Google's app verification process · why timezone handling deserves explicit test coverage · reviewing AI-generated code as a distinct skill from writing it · that the hard part of a product is finding someone who needs it, not building it
