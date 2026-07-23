# Sam Camping Admin & Booking Platform

A full-stack management platform for Sam Camping, combining an operations dashboard, public booking APIs, real-time waiter requests, multilingual menu management, and a customer-facing website.

The backend and admin dashboard are built with Next.js and PostgreSQL. A lightweight static customer website is included in the `samcamping` directory and can communicate with the backend through the included Nginx reverse proxy.

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
