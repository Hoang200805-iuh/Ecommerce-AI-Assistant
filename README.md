# SmartPhone E-comere

## 1. Cai dat

### 1.1 Cai dat thu vien local

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

cd ..\frontend
npm install
```

### 1.2 Cai dat va build bang Docker

```bash
docker compose build
```

## 2. Cach chay du an

### Tuy chon 1: Chay tren may tinh local (development)

Can mo 2 terminal: 1 terminal cho backend va 1 terminal cho frontend.

#### 2.1 Chay backend (FastAPI)

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 3001
```

Neu dung dang ky bang email OTP Gmail, tao file `.env` trong `backend/`:

```bash
OTP_EMAIL_SMTP_HOST=smtp.gmail.com
OTP_EMAIL_PORT=587
OTP_EMAIL_USERNAME=your_gmail@gmail.com
OTP_EMAIL_PASSWORD=your_app_password
OTP_EMAIL_FROM=your_gmail@gmail.com
OTP_EMAIL_EXPIRE_MINUTES=5
```

Backend sau khi chay:
- API base: `http://localhost:3001`
- Swagger docs: `http://localhost:3001/docs`
- Health check: `http://localhost:3001/health`

#### 2.2 Chay frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend mac dinh chay o: `http://localhost:5173`

#### 2.3 Cau hinh API cho frontend (tuy chon)

Frontend dang dung mac dinh `http://localhost:3001/api` trong file `src/services/api.js`.
Neu muon doi API, tao file `.env` trong thu muc `frontend/`:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
```

If you plan to run with PostgreSQL (recommended for Docker), set `DATABASE_URL` in the backend `.env`:

```bash
DATABASE_URL=postgresql+asyncpg://postgres:password@postgres:5432/smartmobile
```

---

### Tuy chon 2: Chay tren AWS Lightsail/Server voi Docker (production/staging)

#### 2.4 Chuong trinh chuan bi

1. **SSH vao server:**
```bash
ssh -i "your_key.pem" ubuntu@your_server_ip
```

2. **Tao Docker network (neu chua co):**
```bash
sudo docker network create smartnet
```

#### 2.5 Chay toan bo stack (PostgreSQL + Backend + Frontend)

**Buoc 1: Xoa container cu (neu co)**
```bash
sudo docker rm -f frontend backend postgres
```

**Buoc 2: Chay PostgreSQL**
```bash
sudo docker run -d \
  --name postgres \
  --network smartnet \
  -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=smartmobile \
  -v pgdata:/var/lib/postgresql/data \
  postgres:15
```

*Ghi chu: Cổng 5432 chỉ nên mở nếu bạn thật sự cần kết nối DB từ bên ngoài hoặc dùng tool như Adminer.*

**Buoc 3: Chay Adminer de xem database bang web**
```bash
sudo docker run -d \
  --name adminer \
  --network smartnet \
  -p 8080:8080 \
  adminer:latest
```

**Buoc 4: Chay Backend** (khong expose port ra ngoai)
```bash
sudo docker run -d \
  --name backend \
  --network smartnet \
  hoaleduc/smartphonee-comere-backend:v1.0
```

**Buoc 5: Chay Frontend**
```bash
sudo docker run -d \
  --name frontend \
  --network smartnet \
  -p 80:80 \
  hoaleduc/smartphonee-comere-frontend:v1.0
```

**Buoc 6: Kiem tra container chay**
```bash
sudo docker ps
```

**Buoc 7: Test backend health (tu trong container)**
```bash
sudo docker exec backend curl http://localhost:3001/health
```

#### 2.6 Cau hinh firewall AWS Lightsail

1. Vao AWS Lightsail Console
2. Click instance cua ban
3. Tab **Networking**
4. **Add rule** -> Them port:
   - Protocol: **TCP**, Port: **80** (Frontend), Source: **0.0.0.0/0**
  - Protocol: **TCP**, Port: **8080** (Adminer), Source: **0.0.0.0/0**
5. Click **Create**

*Ghi chu: Backend khong expose port ra ngoai, chi co the goi qua frontend reverse proxy. Adminer chi nen mo khi can xem DB.*

#### 2.7 Truy cap ung dung

- **Frontend:** `http://smartmobileai.store` hoac `http://your_server_ip`
- **API (qua frontend proxy):** `http://smartmobileai.store/api/*`
- **Adminer:** `http://smartmobileai.store:8080` hoac `http://your_server_ip:8080`
- **Swagger Docs:** Khong public (backend hidden)

#### 2.8 Xem log container

```bash
# Xem log backend (internal)
sudo docker logs backend

# Xem log frontend
sudo docker logs frontend

# Xem log postgres
sudo docker logs postgres

# Xem log real-time (follow)
sudo docker logs -f frontend
```

#### 2.9 Dung lai hoac restart container

```bash
# Stop container
sudo docker stop backend
sudo docker stop frontend
sudo docker stop postgres

# Restart container
sudo docker restart backend
sudo docker restart frontend
sudo docker restart postgres
sudo docker restart adminer

# Hoac restart cung luc
sudo docker restart backend frontend postgres adminer

# Xoa container va data
sudo docker rm -f frontend backend postgres adminer
sudo docker volume rm pgdata
```

---

### Tuy chon 3: Dung docker-compose (neu server co plugin)

```bash
# Check xem co docker-compose khong
docker compose version

# Neu co, chay command
cd /path/to/project
sudo docker compose up -d

# Xem status
sudo docker compose ps

# Xem log
sudo docker compose logs -f backend
```

---

## 3. Bien moi truong (.env files)

```text
SmartPhone E-comere/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # auth, products, orders, warehouse, admin
│   │   ├── core/               # config, security
│   │   ├── db/                 # session, base
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # business logic
│   │   └── main.py             # FastAPI app
│   ├── prisma/                 # schema + migrations
│   ├── tests/
│   ├── main.py                 # entrypoint uvicorn main:app
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/         # ui components
│   │   ├── features/           # checkout, community, ...
│   │   ├── layouts/
│   │   ├── pages/              # customer, admin, warehouse pages
│   │   ├── routes/
│   │   ├── services/           # API client
│   │   ├── store/
│   │   └── styles/
│   └── package.json
└── README.md
```