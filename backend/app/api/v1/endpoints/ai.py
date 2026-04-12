from functools import lru_cache
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.config import DB_PATH
from app.services.rag_engine import PhoneRAGEngine


router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatHistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatHistoryItem] = Field(default_factory=list)
    top_k: int = Field(default=5, ge=1, le=10)


@lru_cache(maxsize=1)
def get_rag_engine() -> PhoneRAGEngine:
    if not DB_PATH.exists():
        raise RuntimeError(f"Khong tim thay database tai: {DB_PATH}")
    return PhoneRAGEngine(DB_PATH)


@router.get("/health")
def ai_health() -> dict[str, object]:
    try:
        engine = get_rag_engine()
        return {
            "success": True,
            "status": "ok",
            "products_indexed": engine.total_products,
            "db_path": str(DB_PATH),
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Khong the khoi tao AI engine: {exc}") from exc


@router.post("/chat")
def ai_chat(request: ChatRequest) -> dict[str, object]:
    try:
        engine = get_rag_engine()
        result = engine.answer(
            query=request.message,
            history=[{"role": item.role, "content": item.content} for item in request.history],
            top_k=request.top_k,
        )
        return {
            "success": True,
            "data": result,
            **result,
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Loi xu ly chatbot: {exc}") from exc


@router.get("/suggestions")
def ai_suggestions(
    q: str = Query(min_length=1, max_length=2000),
    limit: int = Query(default=3, ge=1, le=10),
) -> dict[str, object]:
    try:
        engine = get_rag_engine()
        result = engine.answer(query=q, history=[], top_k=limit)
        products = result.get("products", [])
        return {
            "success": True,
            "data": products,
            "answer": result.get("answer", ""),
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Loi goi y san pham AI: {exc}") from exc


@router.post("/reload")
def ai_reload() -> dict[str, object]:
    try:
        engine = get_rag_engine()
        engine.reload()
        return {
            "success": True,
            "status": "reloaded",
            "products_indexed": engine.total_products,
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Khong the reload AI index: {exc}") from exc