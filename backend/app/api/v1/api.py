from fastapi import APIRouter

from app.api.v1.endpoints import products, warehouse, orders, auth, admin, ai

api_router = APIRouter()
api_router.include_router(products.router)
api_router.include_router(warehouse.router)
api_router.include_router(orders.router)
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(ai.router)
