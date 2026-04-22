## Sam Camping Admin

Admin app cho booking, services, locales và vận hành quán, chạy bằng Next.js + PostgreSQL.

## Chạy local không dùng Docker

1. Tạo file `.env` từ `.env.example`
2. Chạy PostgreSQL local hoặc container riêng
3. Chạy các lệnh:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Chạy bằng Docker Compose

1. Tạo file `.env` từ `.env.example`
2. Chạy:

```bash
docker compose up --build
```

Flow khởi động:
- `postgres`: khởi động database
- `setup`: chờ database healthy, sau đó chạy `db:generate`, `db:migrate`, `db:seed`
- `admin`: chỉ khởi động sau khi `setup` thành công

App sẽ chạy tại `http://localhost:3000`.

## Biến môi trường

Xem `.env.example`:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `UPLOAD_DIR`

## Ghi chú

- Upload ảnh hiện lưu local volume tại `/app/uploads`
- Export locales có route tại `/api/locales/export?locale=vi`
- Upload API có route tại `/api/upload`
- Nếu thay schema, chạy lại `npm run db:generate`

## Lệnh tiện dụng

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:setup
npm run build
```

## Production note

Compose hiện phù hợp cho self-host đơn giản. Nếu đưa production thật, nên bổ sung reverse proxy, backup volume Postgres và chiến lược rotation cho uploads.
