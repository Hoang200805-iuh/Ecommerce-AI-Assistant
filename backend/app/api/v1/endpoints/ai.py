from functools import lru_cache
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.config import (
    DB_PATH,
    GEMINI_API_KEY,
    GEMINI_MAX_OUTPUT_TOKENS,
    GEMINI_MODEL,
    GEMINI_THINKING_BUDGET,
    GEMINI_TIMEOUT_SECONDS,
    RAG_FEATURE_ENRICHMENT_ENABLED,
)
from app.services.google_llm import GeminiClient, GeminiConfig
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
    llm_client = GeminiClient(
        GeminiConfig(
            api_key=GEMINI_API_KEY,
            model=GEMINI_MODEL,
            timeout_seconds=GEMINI_TIMEOUT_SECONDS,
            max_output_tokens=GEMINI_MAX_OUTPUT_TOKENS,
            thinking_budget=GEMINI_THINKING_BUDGET,
        )
    )
    return PhoneRAGEngine(
        DB_PATH,
        llm_client=llm_client,
        feature_enrichment_enabled=RAG_FEATURE_ENRICHMENT_ENABLED,
    )


@router.get("/health")
def ai_health() -> dict[str, object]:
    try:
        engine = get_rag_engine()
        return {
            "success": True,
            "status": "ok",
            "products_indexed": engine.total_products,
            "db_path": str(DB_PATH),
            "llm_enabled": engine.llm_enabled,
            "llm_model": engine.llm_model,
            "llm_error": engine.llm_last_error,
            "llm_quota_limited": engine.llm_quota_limited,
            "feature_sources": engine.feature_sources,
            "feature_ready": engine.features_ready,
            "missing_feature_scores": engine.missing_feature_count,
            "feature_error": engine.feature_error,
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
        get_rag_engine.cache_clear()
        engine = get_rag_engine()
        return {
            "success": True,
            "status": "reloaded",
            "products_indexed": engine.total_products,
            "llm_enabled": engine.llm_enabled,
            "llm_model": engine.llm_model,
            "feature_sources": engine.feature_sources,
            "feature_ready": engine.features_ready,
            "missing_feature_scores": engine.missing_feature_count,
            "feature_error": engine.feature_error,
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Khong the reload AI index: {exc}") from exc


@router.post("/features/rebuild")
def ai_rebuild_features(force: bool = Query(default=False)) -> dict[str, object]:
    try:
        engine = get_rag_engine()
        summary = engine.prepare_missing_features(force=force)
        engine.reload()
        return {
            "success": True,
            "summary": summary,
            "products_indexed": engine.total_products,
            "feature_sources": engine.feature_sources,
            "feature_ready": engine.features_ready,
            "missing_feature_scores": engine.missing_feature_count,
            "feature_error": engine.feature_error,
            "llm_enabled": engine.llm_enabled,
            "llm_quota_limited": engine.llm_quota_limited,
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Khong the rebuild feature scores: {exc}") from exc
