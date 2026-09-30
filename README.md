# IT Help Desk Management

A local helpdesk workspace for ticket intake, assignments, public replies and internal notes, audit history, SLA monitoring, notifications, and operational reports.

## Run Locally

Start the API in one terminal:

```powershell
Set-Location server
npm install
npm start
```

Start the web client in another terminal:

```powershell
Set-Location client
npm install
npm run dev
```

Open the URL printed by Vite. The client proxies `/api` requests to `http://localhost:3001`.

## Local Demo Accounts

Demo accounts are seeded automatically outside production. Choose an account on the sign-in page or use these credentials:

| Role | Email | Password |
|---|---|---|
| Requester | `requester@helpdesk.local` | `Requester123!` |
| Agent | `agent@helpdesk.local` | `Agent123!` |
| Manager | `manager@helpdesk.local` | `Manager123!` |
| Admin | `admin@helpdesk.local` | `Admin123!` |

These credentials are for local development only. Demo users and tickets are not seeded when `NODE_ENV=production`.

## Data And Configuration

SQLite data is stored at `server/data/helpdesk.sqlite` by default and persists across API restarts. Set `HELPDESK_DB_PATH` to use another path. Local database files are ignored by Git.

In production, create the first administrator by setting `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` before starting the server. Optionally set `BOOTSTRAP_ADMIN_NAME`. Do not use the local demo passwords in production.

Ticket SLA targets use 24/7 elapsed time. Defaults are Critical 1h/4h, High 4h/8h, Medium 8h/24h, and Low 24h/72h for first response/resolution, with warnings at 75% elapsed. Admins can update targets in Administration.

Authentication uses server-side sessions, HttpOnly cookies, CSRF tokens for state-changing requests, and scrypt password hashes. Role checks are enforced by the API as well as reflected in the UI.# IT Help Desk Management System

This project manages IT support tickets, assignments, SLA tracking, resolution, and reporting.
