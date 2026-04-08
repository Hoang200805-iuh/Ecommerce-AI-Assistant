# SmartPhone E-comere

## 1. Cach chay du an

Can mo 2 terminal: 1 terminal cho backend va 1 terminal cho frontend.

### 1.1 Chay backend (FastAPI)

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

### 1.2 Chay frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend mac dinh chay o: `http://localhost:5173`

### 1.3 Cau hinh API cho frontend (tuy chon)

Frontend dang dung mac dinh `http://localhost:3001/api` trong file `src/services/api.js`.
Neu muon doi API, tao file `.env` trong thu muc `frontend/`:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

## 2. Cau truc thu muc

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