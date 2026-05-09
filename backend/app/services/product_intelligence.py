from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Protocol

logger = logging.getLogger("uvicorn.error")


PRODUCT_FEATURE_COLUMNS: dict[str, str] = {
    "feature_performance_score": "REAL",
    "feature_gaming_score": "REAL",
    "feature_camera_score": "REAL",
    "feature_battery_score": "REAL",
    "feature_display_score": "REAL",
    "feature_premium_score": "REAL",
    "feature_confidence": "REAL",
    "feature_source": "TEXT",
    "feature_reason": "TEXT",
    "feature_signature": "TEXT",
    "feature_updated_at": "TEXT",
}


def _clamp_score(value: Any, default: float = 2.5) -> float:
    try:
        score = float(value)
    except (TypeError, ValueError):
        score = default
    return max(0.0, min(5.0, score))


def _clamp_confidence(value: Any, default: float = 0.7) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return default
    if 0.0 <= confidence <= 1.0:
        return confidence
    return _clamp_score(confidence, default=default * 5) / 5


def _compact(text: str | None, max_chars: int = 700) -> str:
    if not text:
        return ""
    compact = " ".join(str(text).split())
    if len(compact) <= max_chars:
        return compact
    return compact[:max_chars].rsplit(" ", 1)[0] + "..."


@dataclass
class ProductFeatureScores:
    performance_score: float = 2.5
    gaming_score: float = 2.5
    camera_score: float = 2.5
    battery_score: float = 2.5
    display_score: float = 2.5
    premium_score: float = 2.5
    confidence: float = 0.35
    source: str = "gemini"
    reason: str = ""

    @classmethod
    def from_dict(cls, data: dict[str, Any], *, source: str) -> "ProductFeatureScores":
        return cls(
            performance_score=_clamp_score(data.get("performance_score")),
            gaming_score=_clamp_score(data.get("gaming_score")),
            camera_score=_clamp_score(data.get("camera_score")),
            battery_score=_clamp_score(data.get("battery_score")),
            display_score=_clamp_score(data.get("display_score")),
            premium_score=_clamp_score(data.get("premium_score")),
            confidence=_clamp_confidence(data.get("confidence")),
            source=source,
            reason=_compact(str(data.get("reason") or ""), max_chars=180),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "performance_score": round(self.performance_score, 3),
            "gaming_score": round(self.gaming_score, 3),
            "camera_score": round(self.camera_score, 3),
            "battery_score": round(self.battery_score, 3),
            "display_score": round(self.display_score, 3),
            "premium_score": round(self.premium_score, 3),
            "confidence": round(self.confidence, 3),
            "source": self.source,
            "reason": self.reason,
        }


@dataclass(frozen=True)
class FeatureInput:
    product_id: int
    name: str
    brand: str
    price: float | None
    rating: float | None
    ram: str | None
    rom: str | None
    battery: str | None
    specs: str
    description: str
    signature: str

    def to_prompt_dict(self) -> dict[str, Any]:
        return {
            "id": self.product_id,
            "name": self.name,
            "brand": self.brand,
            "price_vnd": self.price,
            "rating": self.rating,
            "ram": self.ram,
            "rom": self.rom,
            "battery": self.battery,
            "specs": _compact(self.specs, max_chars=900),
            "description": _compact(self.description, max_chars=500),
        }


class FeatureLLMClient(Protocol):
    @property
    def is_configured(self) -> bool: ...

    @property
    def model(self) -> str: ...

    def generate_json(self, prompt: str, **kwargs: Any) -> dict[str, Any] | None: ...


def build_feature_signature(*parts: Any) -> str:
    normalized = json.dumps(parts, ensure_ascii=False, sort_keys=True, default=str)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def ensure_sqlite_product_feature_columns(db_path: str | Path) -> None:
    try:
        with sqlite3.connect(db_path) as conn:
            existing = {
                row[1]
                for row in conn.execute("PRAGMA table_info(phones)").fetchall()
            }
            for column, column_type in PRODUCT_FEATURE_COLUMNS.items():
                if column in existing:
                    continue
                conn.execute(f"ALTER TABLE phones ADD COLUMN {column} {column_type}")
    except sqlite3.Error as exc:
        logger.warning("ensure_sqlite_product_feature_columns_failed err=%s", str(exc))


def ensure_product_feature_columns_sync(connection: Any) -> None:
    dialect = connection.dialect.name
    if dialect == "sqlite":
        existing = {
            row["name"] if isinstance(row, dict) else row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(phones)").fetchall()
        }
    else:
        existing = {
            row[0]
            for row in connection.exec_driver_sql(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'phones'
                """
            ).fetchall()
        }

    for column, column_type in PRODUCT_FEATURE_COLUMNS.items():
        if column in existing:
            continue
        connection.exec_driver_sql(f"ALTER TABLE phones ADD COLUMN {column} {column_type}")


def feature_scores_from_row(row: Any, signature: str) -> ProductFeatureScores | None:
    try:
        row_signature = row["feature_signature"]
    except (KeyError, IndexError):
        return None
    if not row_signature or row_signature != signature:
        return None

    required = [
        "feature_performance_score",
        "feature_gaming_score",
        "feature_camera_score",
        "feature_battery_score",
        "feature_display_score",
        "feature_premium_score",
    ]
    if any(row[column] is None for column in required):
        return None
    if row["feature_source"] != "gemini":
        return None

    return ProductFeatureScores(
        performance_score=_clamp_score(row["feature_performance_score"]),
        gaming_score=_clamp_score(row["feature_gaming_score"]),
        camera_score=_clamp_score(row["feature_camera_score"]),
        battery_score=_clamp_score(row["feature_battery_score"]),
        display_score=_clamp_score(row["feature_display_score"]),
        premium_score=_clamp_score(row["feature_premium_score"]),
        confidence=_clamp_confidence(row["feature_confidence"]),
        source="gemini",
        reason=_compact(row["feature_reason"], max_chars=180),
    )


def feature_scores_to_db_values(features: ProductFeatureScores, signature: str) -> dict[str, Any]:
    return {
        "feature_performance_score": features.performance_score,
        "feature_gaming_score": features.gaming_score,
        "feature_camera_score": features.camera_score,
        "feature_battery_score": features.battery_score,
        "feature_display_score": features.display_score,
        "feature_premium_score": features.premium_score,
        "feature_confidence": features.confidence,
        "feature_source": features.source,
        "feature_reason": features.reason,
        "feature_signature": signature,
    }


def apply_feature_scores_to_object(target: Any, features: ProductFeatureScores, signature: str) -> None:
    for column, value in feature_scores_to_db_values(features, signature).items():
        setattr(target, column, value)
    setattr(target, "feature_updated_at", datetime.utcnow())


def extract_gemini_features(
    products: list[FeatureInput],
    llm_client: FeatureLLMClient | None,
    *,
    enabled: bool,
) -> dict[int, ProductFeatureScores]:
    if not enabled or not llm_client or not llm_client.is_configured:
        return {}

    return GeminiProductFeatureExtractor(llm_client).extract(products)


class GeminiProductFeatureExtractor:
    def __init__(self, llm_client: FeatureLLMClient, *, batch_size: int = 12):
        self.llm_client = llm_client
        self.batch_size = batch_size

    def extract(self, products: list[FeatureInput]) -> dict[int, ProductFeatureScores]:
        if not products or not self.llm_client.is_configured:
            return {}

        extracted: dict[int, ProductFeatureScores] = {}
        for start in range(0, len(products), self.batch_size):
            batch = products[start : start + self.batch_size]
            extracted.update(self._extract_batch(batch))
        return extracted

    def _extract_batch(self, products: list[FeatureInput]) -> dict[int, ProductFeatureScores]:
        prompt = f"""
You are a smartphone product intelligence engine.
Use the product specs and your general knowledge of mobile chipsets, GPUs, displays, cameras, and battery behavior.

For each product, return normalized 0-5 scores:
- performance_score: CPU/GPU/SoC capability and RAM headroom.
- gaming_score: sustained gaming suitability, including chipset, RAM, refresh rate, cooling hints, and battery.
- camera_score: rear/selfie camera potential from specs.
- battery_score: battery capacity and expected endurance hints.
- display_score: refresh rate and display quality hints.
- premium_score: overall flagship/premium feel.
- confidence: 0-5, lower if specs are sparse.

Do not invent prices, stock, or missing specs. Scores may use public model/chipset knowledge when names are present.
Return strict JSON only:
{{
  "products": [
    {{
      "id": 123,
      "performance_score": 0,
      "gaming_score": 0,
      "camera_score": 0,
      "battery_score": 0,
      "display_score": 0,
      "premium_score": 0,
      "confidence": 0,
      "reason": "short reason"
    }}
  ]
}}

Products:
{json.dumps([product.to_prompt_dict() for product in products], ensure_ascii=False)}
"""
        payload = self.llm_client.generate_json(
            prompt,
            temperature=0.0,
            max_output_tokens=2600,
        )
        items = payload.get("products") if isinstance(payload, dict) else None
        if not isinstance(items, list):
            return {}

        product_ids = {product.product_id for product in products}
        features: dict[int, ProductFeatureScores] = {}
        for item in items:
            if not isinstance(item, dict):
                continue
            try:
                product_id = int(item.get("id"))
            except (TypeError, ValueError):
                continue
            if product_id not in product_ids:
                continue
            features[product_id] = ProductFeatureScores.from_dict(item, source="gemini")
        return features
