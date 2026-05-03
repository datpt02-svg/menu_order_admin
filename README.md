## Sam Camping Admin

Admin app cho booking, services, locales và vận hành quán, chạy bằng Next.js + PostgreSQL.

## Chạy local không dùng Docker

1. Tạo file `.env` từ `.env.example`
2. Đặt `DB_HOST=localhost` trong `.env` nếu chạy app/CLI ngoài Docker
3. Chạy PostgreSQL local hoặc container riêng expose `5432`
4. Chạy các lệnh:

```bash
npm run db:generate
npm run db:migrate
npm run dev
```

## Chạy bằng Docker Compose

1. Tạo file `.env` từ `.env.example`
2. Không cần đổi `DB_HOST` trong `.env`; Compose sẽ tự inject `DB_HOST=postgres` cho container `setup` và `admin`
3. Chạy:

```bash
docker compose up --build
```

Flow khởi động:
- `postgres`: khởi động database
- `setup`: chờ database healthy, sau đó chạy `db:generate`, `db:migrate`
- `admin`: chỉ khởi động sau khi `setup` thành công

App sẽ chạy tại `http://localhost:3000`.

## Biến môi trường

Xem `.env.example`:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DB_HOST`
- `DB_PORT`
- `DATABASE_URL` (optional override)
- `UPLOAD_DIR`
- `NEXT_PUBLIC_API_BASE_URL` (optional cho `samcamping` chạy cross-origin trong dev)
- `CORS_ALLOWED_ORIGINS` (optional cho API public trong dev)

## Chạy `samcamping` để test nhanh

### Same-origin (khuyến nghị)
Serve `samcamping` cùng origin với Next để client giữ relative URL cho API.

### Cross-origin dev tạm thời
Nếu chạy `samcamping` bằng static server riêng:

1. Chạy backend realtime ở `3001`:

```bash
npm install
npm run dev:3001
```

2. Giữ `samcamping/config.js` với giá trị local dev mặc định:

```js
window.SAM_API_BASE_URL = window.SAM_API_BASE_URL || "http://localhost:3001";
```

3. Serve `samcamping` bằng static server riêng ở `3000`.

Khi đó client sẽ gọi API sang `3001`, còn backend sẽ cho qua CORS theo `CORS_ALLOWED_ORIGINS`.

### Deploy ghép với site hiện tại
Khi ghép với site `https://test01.samcampinghaiphong.com/`:

- deploy backend/admin bằng Docker Compose ở domain hoặc subdomain riêng
- chỉnh duy nhất `samcamping/config.js` để trỏ tới domain backend thật
- thêm origin `https://test01.samcampinghaiphong.com` vào `CORS_ALLOWED_ORIGINS`

Ví dụ:

```js
window.SAM_API_BASE_URL = "https://admin-api.example.com";
```

Không cần sửa `samcamping/app.js` hay business logic khi đổi môi trường.

## DB connection contract

App và Drizzle CLI cùng dùng một contract:

1. Nếu có `DATABASE_URL` thì dùng nguyên giá trị đó.
2. Nếu không có, app sẽ tự build connection string từ:
   - `DB_HOST`
   - `DB_PORT`
   - `POSTGRES_DB`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`

Cách này giúp local host process dùng `localhost`, còn Docker container dùng `postgres` mà không phải sửa source code.

## Upload path

- `UPLOAD_DIR` có thể trỏ tới `/app/uploads` trong Docker
- Nếu không cấu hình, app sẽ dùng giá trị từ env contract hiện tại

## Ghi chú

- Upload ảnh hiện lưu local volume tại `/app/uploads`
- Export locales có route tại `/api/locales/export?locale=vi`
- Upload API có route tại `/api/upload`
- Nếu thay schema, chạy lại `npm run db:generate`

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

`db:seed` vẫn tồn tại để chạy tay khi thật sự cần nạp dữ liệu mẫu.
```

## Production note

Compose hiện phù hợp cho self-host đơn giản. Nếu đưa production thật, nên bổ sung reverse proxy, backup volume Postgres và chiến lược rotation cho uploads.
