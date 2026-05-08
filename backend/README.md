# SmartMobile Backend (FastAPI)

Backend duoc to chuc lai theo layered architecture de de bao tri va de mo rong.

## 1. Cau truc thu muc

```text
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/  # Route handlers (auth, products, orders, ...)
│   │   │   └── api.py      # Gom router
│   ├── core/               # Config, security
│   │   ├── config.py
│   │   └── security.py
│   ├── models/             # SQLAlchemy models
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic services
│   ├── db/                 # Database setup
│   │   ├── base.py
│   │   └── session.py
│   ├── utils/              # Helpers
│   ├── main.py             # FastAPI app entry
│   └── __init__.py
├── tests/
├── .env
├── requirements.txt
├── main.py                 # Compatibility entrypoint for uvicorn main:app
└── README.md
```

## 2. Cai dat va chay

Tu thu muc `backend/`:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 3001
```

- API base URL: `http://localhost:3001`
- Swagger UI: `http://localhost:3001/docs`
- Health check: `http://localhost:3001/health`

## 3. Quy uoc code

- Router chi xu ly request/response (`app/api/v1/endpoints`).
- Schema dat trong `app/schemas`.
- Model dat trong `app/models`.
- Ket noi DB va session dat trong `app/db`.
- Cac logic nghiep vu nen dua vao `app/services` khi he thong lon hon.

## 4. Cac endpoint hien co

- `GET /api/products`
- `GET /api/products/{id}`
- `GET /api/brands`
- `POST /api/users/register` (dang ky bang so dien thoai, khong OTP)
- `POST /api/users/register/request-otp` (gui OTP Gmail cho dang ky bang email)
- `POST /api/users/register/verify-otp` (xac thuc OTP va tao tai khoan email)
- `POST /api/users/login` (dang nhap bang email hoac so dien thoai)
- `POST /api/users/google-login` (dang nhap nhanh bang Google)
 
- `POST /api/orders`
- `GET /api/orders/user/{email}`
- `PATCH /api/orders/{id}/cancel`
- `GET /api/warehouse/inventory`
- `PATCH /api/warehouse/inventory/{id}`
- `GET /api/warehouse/orders`
- `PATCH /api/warehouse/orders/{id}/status`
- `GET /api/admin/reports`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/{id}`
- `DELETE /api/admin/users/{id}`

## 5. Cau hinh OTP Gmail

Tao file `.env` trong thu muc `backend/`:

```bash
OTP_EMAIL_SMTP_HOST=smtp.gmail.com
OTP_EMAIL_PORT=587
OTP_EMAIL_USERNAME=your_gmail@gmail.com
OTP_EMAIL_PASSWORD=your_app_password
OTP_EMAIL_FROM=your_gmail@gmail.com
OTP_EMAIL_EXPIRE_MINUTES=5
GOOGLE_CLIENT_ID=your_google_oauth_web_client_id

Example for PostgreSQL (used in Docker):

```bash
DATABASE_URL=postgresql+asyncpg://postgres:password@postgres:5432/smartmobile
```
```

Luu y:
- `OTP_EMAIL_PASSWORD` la App Password cua Gmail (khong dung mat khau dang nhap thuong).
- Neu chua cau hinh SMTP, API gui OTP se bao loi cau hinh.
- `GOOGLE_CLIENT_ID` duoc dung de xac minh token khi dang nhap nhanh bang Google.
 
