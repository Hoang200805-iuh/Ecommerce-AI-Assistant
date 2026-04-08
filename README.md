# SmartPhone E-comere

## 1. Cách chạy dự án

Dự án gồm 2 phần chính:

Backend: FastAPI

Frontend: React + Vite

Cần mở 2 terminal riêng biệt để chạy.


### 1.1 Chạy backend (FastAPI)

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 3001
```

Backend sau khi chay:
- API base: `http://localhost:3001`
- Swagger docs: `http://localhost:3001/docs`
- Health check: `http://localhost:3001/health`

### 1.2 Chạy frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định chạy ở: `http://localhost:5173`

### 1.3 Cấu hình API cho frontend (tùy chọn)

Frontend đang dùng mặc định  `http://localhost:3001/api` trong file `src/services/api.js`.
Nếu muốn đổi API, tạo file `.env` trong thư mục `frontend/`:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

## 2. Cấu trúc thư mục

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
