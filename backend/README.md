# SmartMobile Agent Backend

This service powers the `frontend/` React app by exposing product, order, review, and AI recommendation APIs that map directly to the ERD described in the proposal. The backend is a TypeScript/Express server backed by PostgreSQL and Prisma.

## Key components
- **Prisma ORM** mirrors the ERD (`Users`, `Products`, `Orders`, `Order_Items`, `Payments`, `Reviews`, `VectorStore`).
- **Sentiment scoring** uses a lightweight keyword map so every review stores a `sentiment_score` alongside the rating.
- **VectorStore** keeps embedding data as JSON arrays so the AI route can run cosine-similarity on product metadata.

## Setup
1. Install dependencies: `cd backend && npm install`.
2. Copy `.env.example` to `.env` and update `DATABASE_URL`/`PORT`/`CORS_ORIGIN` as needed.
3. Generate Prisma client: `npm run prisma:generate`.
4. Apply migrations and seed sample data:
   ```bash
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```
5. Run the server in dev: `npm run dev` (or `npm start` once you build via `npm run build`).

## API overview
### Products
- `GET /api/products`: searchable list (query params: `search`, `brand`, `minPrice`, `maxPrice`, `limit`). Returns `price`, `specifications`, `reviewCount`, and AI vector metadata.
- `GET /api/products/:productId`: full product detail with up to 10 newest reviews and vector context.

### Orders & Payments
- `POST /api/orders`: payload `{ userId, items, paymentMethod, shippingAddress, coupon }`. Creates `Order`, `OrderItems`, `Payment`, and decrements `stock` atomically.
- `GET /api/orders/:orderId`: fetches order timeline, items, and payment info.
- `GET /api/orders/user/:userId`: list recent customer orders.

### Reviews
- `POST /api/reviews`: accepts `{ userId, productId, rating, comment }`, calculates `sentiment_score` and persists the record.
- `GET /api/reviews/product/:productId`: returns reviews along with reviewer names.

### AI & Vector search
- `GET /api/ai/suggestions?q=<text>&limit=<n>`: vectorizes the query, runs cosine similarity over `VectorStore`, and returns the top products with the matching context snippet.

## Data notes
- `Order.total_price` and `OrderItem.price` use `Decimal` to preserve currency precision.
- `Products.specifications` and `VectorStore.embedding` are stored as JSON/JSONB so each record can carry varying attribute sets.
- Sample data includes three phones, one seeded order, and vector rows aligned to each product.

## Next steps
- Hook the React `frontend/src/services/api.js` helpers to these routes so UI components can consume real data.
- Swap the stubbed sentiment/embedding services for real ML services as the MVP matures.
