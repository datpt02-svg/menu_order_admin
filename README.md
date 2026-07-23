# Sam Camping Operations & Booking Management Platform

Sam Camping is a full-stack operations platform for managing the daily activities of a hospitality venue from one central system. It connects a customer-facing website with an internal administration dashboard, backend APIs, a PostgreSQL database, and real-time staff notifications.

The repository is intended for venues such as camping sites, restaurants, cafés, or service-based hospitality businesses that need to manage bookings, tables, services, menus, customer requests, deposits, translations, and staff schedules in a coordinated way.

## What This Repository Is For

This project provides two connected applications:

1. **A customer-facing website** where visitors can view information, interact with available services, submit bookings, and send service requests.
2. **An internal administration system** where managers and staff can review bookings, assign tables, process deposits, maintain menus and services, respond to waiter requests, manage translations, and organize staff shifts.

Both applications use the same backend and database, so information entered by customers can be handled directly by the operations team without being copied manually between separate tools.

## Project Purpose

The main purpose of this repository is to create a single operational source of truth for Sam Camping.

Instead of managing different parts of the business through disconnected spreadsheets, messages, static website content, and manual records, the platform brings them together in one system:

- Customer booking data is stored and tracked centrally.
- Booking and deposit statuses follow a defined workflow.
- Zones and tables can be managed alongside reservations.
- Waiter requests are delivered to staff in real time.
- Menu items, services, prices, images, and visibility can be updated from the admin system.
- Multilingual content can be maintained and exported consistently.
- Staff members, shifts, and assignments can be planned in the same application.

## Problems It Solves

### 1. Fragmented booking management

Bookings can otherwise arrive through several channels and be tracked manually. This project stores each booking in a structured database, records status changes, supports table assignment, and keeps a history of the booking lifecycle.

### 2. Manual deposit verification

Customers may submit deposit evidence that staff need to review. The platform stores the submitted deposit slip and provides explicit review states such as submitted, approved, or rejected.

### 3. Slow communication between customers and staff

Customer service requests can be missed when they depend only on verbal communication or messaging applications. Socket.IO is used to deliver waiter requests and status updates to the operations interface in real time.

### 4. Inconsistent menu and service information

When menu items, services, prices, images, or availability are maintained directly in static website files, updates are difficult to control. The administration dashboard provides structured management for this content and exposes it through backend APIs.

### 5. Repeated multilingual content updates

The system stores locale keys and translations centrally, allowing translated content to be edited, published, and exported without duplicating translation logic across the customer website.

### 6. Disconnected staff scheduling

Managers can maintain staff profiles, shift templates, scheduled shifts, and staff assignments in the same platform used for bookings and venue operations.

### 7. Difficult local and self-hosted deployment

The repository includes Docker Compose, database setup automation, persistent volumes, and an Nginx reverse proxy so the customer website, admin application, API, real-time server, and PostgreSQL database can be started as one stack.

## Intended Users

- **Venue managers** — monitor bookings, deposits, tables, services, and staffing.
- **Reception or cashier staff** — review reservations and customer deposit information.
- **Service staff** — receive and process waiter requests.
- **Content administrators** — maintain services, menu items, images, and translations.
- **Developers and operators** — integrate the public website, run migrations, and deploy the platform.

## Typical Operational Flow

1. A customer uses the public website to submit a booking.
2. The booking is stored in PostgreSQL and appears in the admin dashboard.
3. Staff review the booking and any submitted deposit slip.
4. A zone or table is assigned and the booking moves through its status workflow.
5. During the visit, customer service requests are sent to staff in real time.
6. Managers update services, menus, translations, and staff schedules from the same administration system.

## Features

- Booking lifecycle management with status history
- Deposit slip submission and review
- Zone and table management
- Real-time waiter requests using Socket.IO
- Service catalogue management
- Multilingual menu sections and menu items
- Locale key, translation, and export management
- Staff directory, shifts, templates, and assignments
- Local image upload support
- Customer-facing booking website integration
- Docker Compose setup with PostgreSQL and Nginx

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL 16 |
| ORM and migrations | Drizzle ORM, Drizzle Kit |
| Real-time communication | Socket.IO |
| Data validation | Zod |
| Tables and calendar UI | TanStack Table, FullCalendar |
| Deployment | Docker, Docker Compose, Nginx |

## System Architecture

```text
Customer browser
      |
      v
Nginx reverse proxy :3002
      |-----------------------------|
      v                             v
Static customer site :3000     Next.js API :3001
                                    |
                                    v
                              PostgreSQL :5432

Admin browser ----------------> Next.js dashboard :3001/dashboard
```

The reverse proxy routes:

- `/` to the static customer website
- `/api/*` to the Next.js backend
- `/uploads/*` to uploaded assets served by the backend
- `/socket.io/*` to the Socket.IO server

## Requirements

For local development:

- Node.js 20 or later
- npm
- PostgreSQL 16 or a compatible version

Alternatively, install Docker and Docker Compose to run the complete stack.

## Environment Variables

Create a `.env` file in the project root:

```env
POSTGRES_DB=samcamping_admin
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

DB_HOST=localhost
DB_PORT=5432

# Optional: overrides the individual database variables above
DATABASE_URL=

UPLOAD_DIR=./public/uploads

# Leave empty for same-origin requests
NEXT_PUBLIC_API_BASE_URL=

# Comma-separated origins allowed to call the public API in development
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3002,http://127.0.0.1:3002
```

### Database connection priority

The application and Drizzle CLI use the same database configuration:

1. `DATABASE_URL` is used when it is set.
2. Otherwise, the connection string is built from `DB_HOST`, `DB_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD`.

Docker Compose automatically overrides `DB_HOST` with `postgres` inside the application containers.

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

Make sure PostgreSQL is running and matches the values in `.env`.

### 3. Apply database migrations

```bash
npm run db:setup
```

### 4. Start the admin application

```bash
npm run dev
```

Open:

- Admin dashboard: `http://localhost:3000/dashboard`
- Backend API: `http://localhost:3000/api`

## Run the Customer Website Locally

The `samcamping` directory contains the customer-facing static website.

For a cross-origin development setup, run the backend on port `3001`:

```bash
npm run dev:3001
```

Then serve the customer website on port `3000`:

```bash
npx serve samcamping -l 3000
```

The default development configuration in `samcamping/config.js` should point to the backend:

```js
window.SAM_API_BASE_URL =
  window.SAM_API_BASE_URL || "http://localhost:3001";
```

Open:

- Customer website: `http://localhost:3000`
- Admin dashboard: `http://localhost:3001/dashboard`

Make sure `CORS_ALLOWED_ORIGINS` includes the customer website origin.

## Docker Compose

Start the complete stack:

```bash
docker compose up --build
```

Docker Compose starts the following services:

| Service | Description |
| --- | --- |
| `postgres` | PostgreSQL database |
| `setup` | Applies database migrations before the app starts |
| `admin` | Next.js admin dashboard, API, and Socket.IO server |
| `user` | Static customer website |
| `proxy` | Nginx reverse proxy for the customer website and backend routes |

After startup, open:

- Customer website through Nginx: `http://localhost:3002`
- Admin dashboard: `http://localhost:3001/dashboard`
- PostgreSQL: `localhost:5432`

Uploaded files and PostgreSQL data are stored in named Docker volumes.

To stop the stack:

```bash
docker compose down
```

To also remove local Docker volumes:

```bash
docker compose down -v
```

## Integrating an Existing Customer Website

For a separately deployed customer website:

1. Deploy the admin/backend service on its own domain or subdomain.
2. Set `window.SAM_API_BASE_URL` in `samcamping/config.js` to the backend URL.
3. Add the customer website origin to `CORS_ALLOWED_ORIGINS`.

Example:

```js
window.SAM_API_BASE_URL = "https://admin-api.example.com";
```

The environment can be changed without modifying `samcamping/app.js` or its business logic.

## Useful Routes

- Locale export: `/api/locales/export?locale=vi`
- Image upload: `/api/upload`
- Socket.IO endpoint: `/socket.io`

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the custom Next.js server on port `3000` |
| `npm run dev:3001` | Start the custom server on port `3001` |
| `npm run build` | Create a production build |
| `npm run start` | Start the production custom server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate a migration after schema changes |
| `npm run db:migrate` | Apply pending Drizzle migrations |
| `npm run db:setup` | Prepare and migrate the database |
| `npm run db:seed` | Seed sample data manually |

## Project Structure

```text
.
├── samcamping/          # Customer-facing static website
├── src/app/             # Next.js pages and API routes
├── src/components/      # Reusable application components
├── src/db/              # Database client, schema, setup, and seed logic
├── drizzle/             # SQL migrations
├── public/uploads/      # Local uploaded assets
├── nginx/               # Reverse proxy configuration
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
└── server.mjs           # Custom Next.js and Socket.IO server
```

## Upload Storage

Uploads are stored locally under `public/uploads` by default. In Docker, the directory is mounted to a persistent named volume.

For a larger production deployment, consider moving uploads to object storage such as Amazon S3, Cloudflare R2, or another compatible service.

## Production Recommendations

Before deploying to production:

- Use strong database credentials and keep secrets outside the repository.
- Put the application behind HTTPS.
- Restrict `CORS_ALLOWED_ORIGINS` to trusted domains.
- Back up the PostgreSQL volume regularly.
- Back up or externalize uploaded files.
- Add monitoring, structured logging, and a restart policy.
- Review database migrations before applying them to production data.
