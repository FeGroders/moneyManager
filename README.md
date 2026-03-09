# Money Manager

A personal finance management web app built with React, TypeScript, and Supabase.

## Features

- **Dashboard** — monthly overview with charts for income vs. expenses by category and monthly evolution
- **Transactions** — log and browse income/expense entries with filtering by period, account, and category
- **Accounts** — support for multiple account types: cash, checking, credit card, and savings
- **Credit Card** — configure credit limit, closing date, and due date
- **Categories** — custom categories separated by type (income / expense)
- **Recurrences** — automatic monthly entries configurable by day of the month
- **Authentication** — sign up, login, password recovery and reset via Supabase Auth

## Stack

| Layer | Technology |
|-------|------------|
| UI | React 18 + TypeScript |
| Build | Vite |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Dates | date-fns (pt-BR) |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or higher
- A [Supabase](https://supabase.com/) account (free tier available)

## Supabase Setup

1. Create a new project in the [Supabase Dashboard](https://app.supabase.com/).
2. In the **SQL Editor** tab, run the migration script located at:
   ```
   supabase/migrations/20260304000000_create_money_tables.sql
   ```
3. In your project settings (**Settings → API**), copy:
   - `Project URL`
   - `anon public` key

## Installation and Running

### Windows (automatic script)

Run the `setup.bat` file in the project root. It installs dependencies and guides you through the `.env` configuration.

### Manual

```bash
# 1. Install dependencies
npm install

# 2. Create the environment variables file
cp .env.example .env   # or create the file manually (see below)

# 3. Start in development mode
npm run dev
```

### Environment Variables

Create a `.env` file in the project root with the following content:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Replace the values with your Supabase project credentials.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the development server at `http://localhost:5173` |
| `npm run build` | Generates the production build in the `dist/` folder |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs ESLint on the source code |

## Project Structure

```
src/
├── components/      # Reusable components
├── contexts/        # Context API (AuthContext)
├── hooks/           # Custom hooks (biometrics, etc.)
├── layouts/         # Page layouts
├── lib/             # Supabase client configuration
├── pages/           # Application pages
│   ├── Dashboard.tsx
│   ├── Transactions.tsx
│   ├── Wallet.tsx
│   ├── AccountDetail.tsx
│   ├── Categories.tsx
│   ├── Recurrents.tsx
│   ├── Settings.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── ForgotPassword.tsx
│   └── ResetPassword.tsx
├── router/          # Route definitions
├── services/        # Supabase communication layer
│   ├── accountsService.ts
│   ├── categoriesService.ts
│   ├── transactionsService.ts
│   ├── recurringService.ts
│   └── transferService.ts
└── types/           # TypeScript types
    ├── account.ts
    ├── category.ts
    ├── transaction.ts
    └── recurring.ts
```

## Deploy

The project is configured for deployment on **Vercel** (`vercel.json` already included).

1. Import the repository on [Vercel](https://vercel.com/).
2. Add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the project settings.
3. Deploy — Vercel detects Vite automatically.
