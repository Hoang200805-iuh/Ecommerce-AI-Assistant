from __future__ import annotations

import json
import math
import re
import sqlite3
import unicodedata
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

from app.services.product_intelligence import (
    FeatureInput,
    GeminiProductFeatureExtractor,
    ProductFeatureScores,
    build_feature_signature,
    ensure_sqlite_product_feature_columns,
    feature_scores_from_row,
    feature_scores_to_db_values,
)
from app.services.rag_rules import DEFAULT_RAG_RULES, RAGRules

@dataclass
class ProductDoc:
    id: int
    name: str
    brand: str
    price: float | None
    rating: float | None
    description: str
    specs: str
    reviews: str
    stock: int
    ram: str | None
    rom: str | None
    battery: str | None
    review_count: int
    created_at: str | None
    searchable_text: str
    normalized_text: str
    tokens: list[str]
    ram_gb: int | None
    rom_gb: int | None
    battery_mah: int | None
    refresh_hz: int | None
    camera_mp: int | None
    chipset_power: float
    semantic_features: ProductFeatureScores | None
    feature_signature: str
    features_persisted: bool


@dataclass
class SearchIntent:
    query: str
    normalized_query: str
    rewritten_query: str = ""
    min_price: float | None = None
    max_price: float | None = None
    brands: set[str] = field(default_factory=set)
    needs: set[str] = field(default_factory=set)
    in_stock_only: bool = False
    sort_mode: str = "relevance"
    source: str = "rules"

    def to_public_dict(self) -> dict[str, Any]:
        return {
            "rewritten_query": self.rewritten_query,
            "min_price": self.min_price,
            "max_price": self.max_price,
            "brands": sorted(self.brands),
            "needs": sorted(self.needs),
            "in_stock_only": self.in_stock_only,
            "sort_mode": self.sort_mode,
            "source": self.source,
        }


@dataclass
class RetrievalInfo:
    mode: str = "exact"
    relaxed_constraints: tuple[str, ...] = ()

    @property
    def is_relaxed(self) -> bool:
        return bool(self.relaxed_constraints)

    def to_public_dict(self) -> dict[str, Any]:
        return {
            "mode": self.mode,
            "relaxed_constraints": list(self.relaxed_constraints),
            "is_relaxed": self.is_relaxed,
        }


class LLMClient(Protocol):
    @property
    def is_configured(self) -> bool: ...

    @property
    def model(self) -> str: ...

    def generate_text(self, prompt: str, **kwargs: Any) -> str | None: ...

    def generate_json(self, prompt: str, **kwargs: Any) -> dict[str, Any] | None: ...


def normalize_text(text: str | None) -> str:
    if not text:
        return ""
    text = text.lower()
    text = text.replace("đ", "d")
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(text: str | None, stopwords: frozenset[str] | None = None) -> list[str]:
    normalized = normalize_text(text)
    if not normalized:
        return []
    active_stopwords = stopwords or DEFAULT_RAG_RULES.stopwords
    return [
        token
        for token in normalized.split()
        if token not in active_stopwords and (len(token) > 1 or token.isdigit())
    ]


def compact_product_text(text: str | None, max_chars: int) -> str:
    if not text:
        return ""

    compact = re.sub(r"\s+", " ", text).strip()
    compact_norm = normalize_text(compact)

    for marker in DEFAULT_RAG_RULES.noise_markers:
        idx = compact_norm.find(marker)
        if idx > 120:
            ratio = idx / max(1, len(compact_norm))
            cut_at = int(len(compact) * ratio)
            compact = compact[:cut_at]
            break

    compact = re.sub(r"\s*\|\s*", " | ", compact)
    compact = re.sub(r"\s+", " ", compact).strip(" |,-")

    if len(compact) > max_chars:
        compact = compact[:max_chars].rsplit(" ", 1)[0] + "..."
    return compact


def format_price_vnd(price: float | None) -> str:
    if price is None:
        return "Lien he"
    value = int(round(price))
    return f"{value:,}".replace(",", ".") + " đ"


def parse_money_value(
    number_text: str,
    unit: str | None,
    unit_multipliers: dict[str, float] | None = None,
    implicit_million_threshold: float | None = None,
) -> float:
    s = number_text.strip()
    if "." in s and "," in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s and "." not in s:
        s = s.replace(",", ".")
    elif "." in s:
        decimal_part = s.split(".")[-1]
        if len(decimal_part) > 2:
            s = s.replace(".", "")
    try:
        value = float(s)
    except ValueError:
        return 0.0

    active_multipliers = unit_multipliers or DEFAULT_RAG_RULES.money_unit_multipliers
    normalized_unit = (unit or "").strip().lower()
    if normalized_unit in active_multipliers:
        return value * active_multipliers[normalized_unit]

    threshold = implicit_million_threshold or DEFAULT_RAG_RULES.implicit_million_threshold
    if value <= threshold:
        return value * 1_000_000
    return value


def extract_ram_text(*texts: str | None) -> str | None:
    for text in texts:
        if not text:
            continue
        for match in re.finditer(r"(\d{1,2})\s*GB\b", text, flags=re.IGNORECASE):
            value = int(match.group(1))
            if 2 <= value <= 24:
                return f"{value} GB"
    return None


def parse_ram_gb(ram_text: str | None) -> int | None:
    if not ram_text:
        return None
    match = re.search(r"(\d{1,2})\s*GB\b", ram_text, flags=re.IGNORECASE)
    if not match:
        return None
    value = int(match.group(1))
    return value if 2 <= value <= 24 else None


def _capacity_matches(text: str) -> list[int]:
    values: list[int] = []
    for match in re.finditer(r"(\d{2,4})\s*(TB|GB)\b", text, flags=re.IGNORECASE):
        amount = int(match.group(1))
        unit = match.group(2).upper()
        gb = amount * 1024 if unit == "TB" else amount
        if gb >= 32:
            values.append(gb)
    return values


def extract_rom_text(*texts: str | None) -> str | None:
    for text in texts:
        if not text:
            continue
        capacities = _capacity_matches(text)
        if not capacities:
            continue
        rom_gb = min(capacities)
        if rom_gb % 1024 == 0 and rom_gb >= 1024:
            return f"{rom_gb // 1024} TB"
        return f"{rom_gb} GB"
    return None


def parse_rom_gb(rom_text: str | None) -> int | None:
    if not rom_text:
        return None
    match = re.search(r"(\d{2,4})\s*(TB|GB)\b", rom_text, flags=re.IGNORECASE)
    if not match:
        return None
    amount = int(match.group(1))
    unit = match.group(2).upper()
    gb = amount * 1024 if unit == "TB" else amount
    return gb if gb >= 32 else None


def extract_battery_text(*texts: str | None) -> str | None:
    for text in texts:
        if not text:
            continue
        match = re.search(r"(\d{3,5})\s*mAh\b", text, flags=re.IGNORECASE)
        if match:
            value = int(match.group(1))
            if 2500 <= value <= 8000:
                return f"{value} mAh"

    for text in texts:
        if not text:
            continue
        hour_match = re.search(
            r"(xem video[^|,.]{0,28}\d+\s*(?:gio|giờ))",
            text,
            flags=re.IGNORECASE,
        )
        if hour_match:
            return compact_product_text(hour_match.group(1), max_chars=34)
    return None


def parse_battery_mah(battery_text: str | None) -> int | None:
    if not battery_text:
        return None
    match = re.search(r"(\d{3,5})\s*mAh\b", battery_text, flags=re.IGNORECASE)
    if not match:
        return None
    value = int(match.group(1))
    return value if 2500 <= value <= 8000 else None


def parse_refresh_hz(text: str | None) -> int | None:
    if not text:
        return None
    matches = [int(m.group(1)) for m in re.finditer(r"(\d{2,3})\s*Hz\b", text, flags=re.IGNORECASE)]
    valid = [hz for hz in matches if 60 <= hz <= 240]
    return max(valid) if valid else None


def parse_camera_mp(text: str | None) -> int | None:
    if not text:
        return None
    matches = [int(m.group(1)) for m in re.finditer(r"(\d{2,3})\s*MP\b", text, flags=re.IGNORECASE)]
    valid = [mp for mp in matches if 8 <= mp <= 250]
    return max(valid) if valid else None


def estimate_chipset_power(text: str | None) -> float:
    normalized = normalize_text(text)
    if not normalized:
        return 0.0

    if "snapdragon" in normalized:
        return 3.0
    if "dimensity" in normalized:
        return 3.0
    if "apple a" in normalized:
        return 3.1
    if "exynos" in normalized:
        return 2.8
    return 2.5


class PhoneRAGEngine:
    def __init__(
        self,
        db_path: str | Path,
        llm_client: LLMClient | None = None,
        rules: RAGRules | None = None,
        feature_enrichment_enabled: bool = True,
    ):
        self.db_path = Path(db_path)
        self.llm_client = llm_client
        self.rules = rules or DEFAULT_RAG_RULES
        self.feature_enrichment_enabled = feature_enrichment_enabled
        self.products: list[ProductDoc] = []
        self.term_freqs: list[Counter[str]] = []
        self.doc_len: list[int] = []
        self.df: Counter[str] = Counter()
        self.avg_doc_len: float = 0.0
        self.brands_map: dict[str, str] = {}
        self._last_feature_error: str | None = None
        self.reload()

    def reload(self) -> None:
        ensure_sqlite_product_feature_columns(self.db_path)
        self.products = self._load_products()
        self.prepare_missing_features()
        self._build_index()

    def _load_products(self) -> list[ProductDoc]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            query = """
            SELECT
              id,
              name,
              brand,
              price,
              rating,
              description,
              specs,
              reviews,
              stock,
              ram,
              rom,
              battery,
              review_count,
              created_at,
              feature_performance_score,
              feature_gaming_score,
              feature_camera_score,
              feature_battery_score,
              feature_display_score,
              feature_premium_score,
              feature_confidence,
              feature_source,
              feature_reason,
              feature_signature,
              feature_updated_at
            FROM phones
            WHERE category IS NULL OR LOWER(category) = 'phone'
            ORDER BY id
            """
            rows = conn.execute(query).fetchall()
        finally:
            conn.close()

        docs: list[ProductDoc] = []
        for row in rows:
            name = row["name"] or ""
            brand = row["brand"] or ""
            raw_description = row["description"] or ""
            raw_specs = row["specs"] or ""
            raw_reviews = row["reviews"] or ""

            description = compact_product_text(raw_description, max_chars=520)
            specs = compact_product_text(raw_specs, max_chars=580)
            reviews = compact_product_text(raw_reviews, max_chars=220)

            ram = extract_ram_text(row["ram"], name, specs)
            rom = extract_rom_text(row["rom"], name, specs)
            battery = extract_battery_text(row["battery"], specs, description)
            ram_gb = parse_ram_gb(ram)
            rom_gb = parse_rom_gb(rom)
            battery_mah = parse_battery_mah(battery)
            refresh_hz = parse_refresh_hz(f"{specs} {description}")
            camera_mp = parse_camera_mp(f"{specs} {description}")
            chipset_power = estimate_chipset_power(f"{name} {specs} {description}")
            feature_signature = build_feature_signature(
                name,
                brand,
                row["price"],
                ram,
                rom,
                battery,
                specs,
                description,
            )
            semantic_features = feature_scores_from_row(row, feature_signature)

            searchable_text = " ".join(
                part
                for part in [
                    name,
                    brand,
                    description,
                    specs,
                    reviews,
                    f"ram {ram}" if ram else "",
                    f"rom {rom}" if rom else "",
                    f"pin {battery}" if battery else "",
                ]
                if part
            )
            normalized_text = normalize_text(searchable_text)
            tokens = tokenize(searchable_text, self.rules.stopwords)

            docs.append(
                ProductDoc(
                    id=int(row["id"]),
                    name=name,
                    brand=brand,
                    price=row["price"],
                    rating=row["rating"],
                    description=description,
                    specs=specs,
                    reviews=reviews,
                    stock=int(row["stock"] or 0),
                    ram=ram,
                    rom=rom,
                    battery=battery,
                    review_count=int(row["review_count"] or 0),
                    created_at=row["created_at"],
                    searchable_text=searchable_text,
                    normalized_text=normalized_text,
                    tokens=tokens,
                    ram_gb=ram_gb,
                    rom_gb=rom_gb,
                    battery_mah=battery_mah,
                    refresh_hz=refresh_hz,
                    camera_mp=camera_mp,
                    chipset_power=chipset_power,
                    semantic_features=semantic_features,
                    feature_signature=feature_signature,
                    features_persisted=semantic_features is not None,
                )
            )
        return docs

    def _feature_signature(self, product: ProductDoc) -> str:
        return product.feature_signature

    def _feature_input(self, product: ProductDoc, signature: str) -> FeatureInput:
        return FeatureInput(
            product_id=product.id,
            name=product.name,
            brand=product.brand,
            price=product.price,
            rating=product.rating,
            ram=product.ram,
            rom=product.rom,
            battery=product.battery,
            specs=product.specs,
            description=product.description,
            signature=signature,
        )

    def _persist_product_features(self, products: list[ProductDoc]) -> None:
        if not products:
            return

        update_columns = [
            "feature_performance_score",
            "feature_gaming_score",
            "feature_camera_score",
            "feature_battery_score",
            "feature_display_score",
            "feature_premium_score",
            "feature_confidence",
            "feature_source",
            "feature_reason",
            "feature_signature",
        ]
        set_clause = ", ".join([f"{column} = ?" for column in update_columns])
        rows = []
        for product in products:
            if product.semantic_features is None:
                continue
            values = feature_scores_to_db_values(product.semantic_features, product.feature_signature)
            rows.append([values[column] for column in update_columns] + [product.id])
        if not rows:
            return

        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.executemany(
                    f"""
                    UPDATE phones
                    SET {set_clause}, feature_updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    rows,
                )
        except sqlite3.Error as exc:
            self._last_feature_error = str(exc)

    def prepare_missing_features(
        self,
        product_ids: set[int] | None = None,
        *,
        force: bool = False,
    ) -> dict[str, int]:
        target_products = [
            product
            for product in self.products
            if (product_ids is None or product.id in product_ids)
            and (force or not product.features_persisted)
        ]
        if not target_products:
            return {"prepared": 0, "gemini": 0, "missing": self.missing_feature_count}

        inputs = [self._feature_input(product, product.feature_signature) for product in target_products]
        extracted_features: dict[int, ProductFeatureScores] = {}
        if self.feature_enrichment_enabled and self.llm_enabled and self.llm_client and not self.llm_quota_limited:
            extractor = GeminiProductFeatureExtractor(self.llm_client)
            extracted_features = extractor.extract(inputs)
        else:
            self._last_feature_error = "gemini_feature_generation_unavailable"

        prepared: list[ProductDoc] = []
        source_counts = Counter()

        for product in target_products:
            feature = extracted_features.get(product.id)
            if feature is None:
                continue
            product.semantic_features = feature
            product.features_persisted = True
            prepared.append(product)
            source_counts[feature.source] += 1

        self._persist_product_features(prepared)
        if len(prepared) < len(target_products) and not self._last_feature_error:
            self._last_feature_error = self.llm_last_error or "gemini_feature_generation_incomplete"
        return {
            "prepared": len(prepared),
            "gemini": source_counts.get("gemini", 0),
            "missing": self.missing_feature_count,
        }

    def _build_index(self) -> None:
        self.term_freqs = []
        self.doc_len = []
        self.df = Counter()
        self.brands_map = {}

        for product in self.products:
            tf = Counter(product.tokens)
            self.term_freqs.append(tf)
            self.doc_len.append(len(product.tokens))
            for token in tf:
                self.df[token] += 1

            norm_brand = normalize_text(product.brand)
            if norm_brand:
                self.brands_map[norm_brand] = product.brand

        self.avg_doc_len = sum(self.doc_len) / len(self.doc_len) if self.doc_len else 0.0

    @property
    def total_products(self) -> int:
        return len(self.products)

    @property
    def feature_sources(self) -> dict[str, int]:
        counter = Counter(
            product.semantic_features.source if product.semantic_features else "missing"
            for product in self.products
        )
        return dict(counter)

    @property
    def missing_feature_count(self) -> int:
        return sum(1 for product in self.products if product.semantic_features is None)

    @property
    def features_ready(self) -> bool:
        return self.missing_feature_count == 0

    @property
    def feature_error(self) -> str | None:
        return self._last_feature_error

    @property
    def llm_enabled(self) -> bool:
        return bool(self.llm_client and self.llm_client.is_configured)

    @property
    def llm_model(self) -> str | None:
        return self.llm_client.model if self.llm_client else None

    @property
    def llm_last_error(self) -> str | None:
        if not self.llm_client:
            return None
        return getattr(self.llm_client, "last_error", None)

    @property
    def llm_quota_limited(self) -> bool:
        error = (self.llm_last_error or "").lower()
        return "429" in error or "quota" in error or "rate limit" in error

    def _bm25_score(self, query_tokens: list[str], doc_index: int) -> float:
        if not query_tokens:
            return 0.0

        k1 = 1.5
        b = 0.75
        tf = self.term_freqs[doc_index]
        dl = self.doc_len[doc_index]
        avgdl = self.avg_doc_len or 1.0
        n_docs = len(self.products) or 1

        score = 0.0
        for token in query_tokens:
            if token not in tf:
                continue
            doc_freq = self.df.get(token, 0)
            idf = math.log(1 + (n_docs - doc_freq + 0.5) / (doc_freq + 0.5))
            term_freq = tf[token]
            numerator = term_freq * (k1 + 1)
            denominator = term_freq + k1 * (1 - b + b * dl / avgdl)
            score += idf * numerator / denominator
        return score

    def _money_unit_pattern(self) -> str:
        units = sorted(self.rules.money_unit_multipliers, key=len, reverse=True)
        return "|".join(re.escape(unit) for unit in units)

    def _parse_money_value(self, number_text: str, unit: str | None) -> float:
        return parse_money_value(
            number_text,
            unit,
            unit_multipliers=self.rules.money_unit_multipliers,
            implicit_million_threshold=self.rules.implicit_million_threshold,
        )

    def _extract_price_filter(self, normalized_query: str) -> tuple[float | None, float | None]:
        number = r"(\d+(?:[.,]\d+)?)"
        unit = rf"(?:\s*({self._money_unit_pattern()}))?"
        budget_prefix = r"(?:gia|muc gia|tam gia|ngan sach|tam tien)?\s*"

        range_pattern = re.search(
            rf"(?:tu)\s+{budget_prefix}{number}{unit}\s+(?:den|toi)\s+{budget_prefix}{number}{unit}",
            normalized_query,
        )
        if range_pattern:
            low = self._parse_money_value(range_pattern.group(1), range_pattern.group(2))
            high = self._parse_money_value(range_pattern.group(3), range_pattern.group(4))
            if low > high:
                low, high = high, low
            return low, high

        around_patterns = [
            rf"(?:khoang|tam|gan)\s+(?:gia|tien)?\s*{number}{unit}",
            rf"(?:tam gia|muc gia|ngan sach|gia)\s*(?:khoang|tam)?\s*{number}{unit}",
        ]
        for pattern in around_patterns:
            around = re.search(pattern, normalized_query)
            if around:
                center = self._parse_money_value(around.group(1), around.group(2))
                margin = max(600_000.0, center * 0.10)
                return round(center - margin), round(center + margin)

        # Short follow-up queries often look like "6 tr thi sao", "7tr di".
        # If user gives exactly one explicit money amount, treat it as target budget.
        explicit_money_matches = list(
            re.finditer(rf"\b(\d+(?:[.,]\d+)?)\s*({self._money_unit_pattern()})\b", normalized_query)
        )
        if len(explicit_money_matches) == 1:
            has_compare_keyword = any(
                key in normalized_query
                for key in self.rules.compare_keywords
            )
            if not has_compare_keyword:
                match = explicit_money_matches[0]
                center = self._parse_money_value(match.group(1), match.group(2))
                margin = max(600_000.0, center * 0.10)
                return round(center - margin), round(center + margin)

        # Bare-number follow-up such as "19 thi sao", "7 di".
        if not explicit_money_matches:
            bare_numbers = list(re.finditer(r"\b(\d{1,3}(?:[.,]\d+)?)\b", normalized_query))
            if len(bare_numbers) == 1:
                has_followup_marker = any(marker in normalized_query for marker in self.rules.followup_markers)
                has_budget_keyword = any(
                    key in normalized_query
                    for key in self.rules.budget_keywords
                )
                if has_followup_marker or has_budget_keyword:
                    center = self._parse_money_value(bare_numbers[0].group(1), "tr")
                    margin = max(600_000.0, center * 0.10)
                    return round(center - margin), round(center + margin)

        upper_pattern = re.search(
            rf"(?:duoi|nho hon|khong qua|toi da|max)\s+(?:gia|tien)?\s*{number}{unit}",
            normalized_query,
        )
        if upper_pattern:
            return None, self._parse_money_value(upper_pattern.group(1), upper_pattern.group(2))

        lower_pattern = re.search(
            rf"(?:tren|hon|toi thieu|min)\s+(?:gia|tien)?\s*{number}{unit}",
            normalized_query,
        )
        if lower_pattern:
            return self._parse_money_value(lower_pattern.group(1), lower_pattern.group(2)), None

        return None, None

    def _extract_brand_filters(self, normalized_query: str) -> set[str]:
        matched_brands: set[str] = set()
        for normalized_brand, original_brand in self.brands_map.items():
            if normalized_brand and normalized_brand in normalized_query:
                matched_brands.add(original_brand)
        for alias, brand in self.rules.brand_aliases.items():
            if alias in normalized_query:
                matched_brands.add(brand)
        return matched_brands

    @staticmethod
    def _matches_any(normalized_query: str, keywords: frozenset[str]) -> bool:
        return any(keyword in normalized_query for keyword in keywords)

    def _wants_in_stock(self, normalized_query: str) -> bool:
        return self._matches_any(normalized_query, self.rules.in_stock_keywords)

    def _wants_gaming(self, normalized_query: str) -> bool:
        return self._sort_mode(normalized_query) == "gaming"

    def _wants_camera(self, normalized_query: str) -> bool:
        return self._sort_mode(normalized_query) == "camera"

    def _extract_needs(self, normalized_query: str) -> set[str]:
        needs: set[str] = set()
        for rule in self.rules.need_rules:
            if self._matches_any(normalized_query, rule.keywords):
                needs.add(rule.name)
                needs.update(rule.implies)
        for rule in self.rules.sort_rules:
            if self._matches_any(normalized_query, rule.keywords):
                needs.update(rule.needs)
        return needs

    def _sort_mode(self, normalized_query: str) -> str:
        for rule in self.rules.sort_rules:
            if self._matches_any(normalized_query, rule.keywords):
                return rule.mode
        return self.rules.default_sort_mode

    def _resolve_brand_names(self, brand_values: list[Any] | set[Any]) -> set[str]:
        matched: set[str] = set()
        for value in brand_values:
            normalized = normalize_text(str(value))
            if not normalized:
                continue
            if normalized in self.brands_map:
                matched.add(self.brands_map[normalized])
                continue
            for alias, brand in self.rules.brand_aliases.items():
                if alias == normalized or alias in normalized:
                    matched.add(brand)
                    break
            for known_normalized, original_brand in self.brands_map.items():
                if known_normalized in normalized or normalized in known_normalized:
                    matched.add(original_brand)
                    break
        return matched

    @staticmethod
    def _safe_price(value: Any) -> float | None:
        if value is None or value == "":
            return None
        try:
            price = float(value)
        except (TypeError, ValueError):
            return None
        if price <= 0:
            return None
        return price

    @staticmethod
    def _history_preview(history: list[dict[str, str]] | None, max_items: int = 6) -> str:
        if not history:
            return "[]"
        compact = [
            {
                "role": item.get("role", ""),
                "content": compact_product_text(item.get("content", ""), max_chars=220),
            }
            for item in history[-max_items:]
            if item.get("content")
        ]
        return json.dumps(compact, ensure_ascii=False)

    def _base_intent_from_rules(
        self,
        query: str,
        history: list[dict[str, str]] | None,
    ) -> SearchIntent:
        normalized_query = normalize_text(query)
        min_price, max_price = self._extract_price_filter(normalized_query)
        brands = self._extract_brand_filters(normalized_query)
        in_stock_only = self._wants_in_stock(normalized_query)
        sort_mode = self._sort_mode(normalized_query)
        needs = self._extract_needs(normalized_query)

        inherited_constraints = self._infer_history_constraints(history, normalized_query)
        inherited_min, inherited_max = inherited_constraints.get("price", (None, None))
        if min_price is None and max_price is None:
            min_price, max_price = inherited_min, inherited_max
        if not in_stock_only and inherited_constraints.get("in_stock"):
            in_stock_only = True
        if sort_mode == self.rules.default_sort_mode and inherited_constraints.get("mode") != self.rules.default_sort_mode:
            sort_mode = inherited_constraints.get("mode", self.rules.default_sort_mode)

        return SearchIntent(
            query=query,
            normalized_query=normalized_query,
            min_price=min_price,
            max_price=max_price,
            brands=brands,
            needs=needs,
            in_stock_only=in_stock_only,
            sort_mode=sort_mode,
            source="rules",
        )

    def _llm_extract_intent(
        self,
        query: str,
        history: list[dict[str, str]] | None,
    ) -> dict[str, Any] | None:
        if not self.llm_enabled or not self.llm_client:
            return None

        known_brands = sorted({product.brand for product in self.products if product.brand})
        allowed_needs = sorted(self.rules.allowed_needs)
        allowed_sort_modes = sorted(self.rules.allowed_sort_modes)
        prompt = f"""
Bạn là bộ phân tích intent cho chatbot tư vấn {self.rules.domain_label} {self.rules.assistant_name}.
Nhiệm vụ: chuyển câu hỏi người dùng thành JSON để hệ thống lọc sản phẩm. Không bịa sản phẩm.

Hãng đang có: {", ".join(known_brands)}
Nhu cầu hợp lệ: {", ".join(allowed_needs)}
sort_mode hợp lệ: {", ".join(allowed_sort_modes)}

Quy đổi tiền Việt:
- "8 củ", "8tr", "8 triệu" = 8000000
- "dưới/không quá/tối đa" tạo max_price_vnd
- "trên/tối thiểu" tạo min_price_vnd
- "tầm/khoảng/gần" tạo cả min_price_vnd và max_price_vnd với biên hợp lý

Lịch sử gần đây: {self._history_preview(history)}
Câu hỏi hiện tại: {query}

Chỉ trả JSON object với các field:
{{
  "rewritten_query": "câu hỏi đã viết lại rõ ràng bằng tiếng Việt",
  "min_price_vnd": number hoặc null,
  "max_price_vnd": number hoặc null,
  "brands": ["tên hãng chuẩn"],
  "needs": {json.dumps(allowed_needs, ensure_ascii=False)},
  "in_stock_only": true hoặc false,
  "sort_mode": "{'|'.join(allowed_sort_modes)}"
}}
"""
        return self.llm_client.generate_json(prompt, temperature=0.0, max_output_tokens=500)

    def _merge_llm_intent(self, base: SearchIntent, llm_data: dict[str, Any] | None) -> SearchIntent:
        if not llm_data:
            return base

        min_price = self._safe_price(llm_data.get("min_price_vnd"))
        max_price = self._safe_price(llm_data.get("max_price_vnd"))
        if min_price is not None and max_price is not None and min_price > max_price:
            min_price, max_price = max_price, min_price

        brands = self._resolve_brand_names(set(llm_data.get("brands") or []))
        needs = {
            normalize_text(need)
            for need in (llm_data.get("needs") or [])
            if normalize_text(need) in self.rules.allowed_needs
        }
        sort_mode = str(llm_data.get("sort_mode") or "").strip().lower() or base.sort_mode
        if sort_mode not in self.rules.allowed_sort_modes:
            sort_mode = base.sort_mode

        rewritten_query = compact_product_text(str(llm_data.get("rewritten_query") or ""), max_chars=240)
        return SearchIntent(
            query=base.query,
            normalized_query=base.normalized_query,
            rewritten_query=rewritten_query,
            min_price=min_price if min_price is not None or max_price is not None else base.min_price,
            max_price=max_price if min_price is not None or max_price is not None else base.max_price,
            brands=brands or base.brands,
            needs=needs or base.needs,
            in_stock_only=bool(llm_data.get("in_stock_only")) or base.in_stock_only,
            sort_mode=sort_mode,
            source="gemini",
        )

    def _build_search_intent(
        self,
        query: str,
        history: list[dict[str, str]] | None,
    ) -> SearchIntent:
        base = self._base_intent_from_rules(query, history)
        llm_data = self._llm_extract_intent(query, history)
        return self._merge_llm_intent(base, llm_data)

    def _score_weighted_features(
        self,
        product: ProductDoc,
        weights: dict[str, float],
        price_center: float | None,
    ) -> float:
        if not weights:
            return 0.0

        if product.semantic_features is None:
            return 0.0

        score = 0.0
        battery_mah = product.battery_mah or 4000
        semantic = product.semantic_features
        feature_values = {
            "performance_score": semantic.performance_score,
            "gaming_score": semantic.gaming_score,
            "camera_score": semantic.camera_score,
            "battery_score": semantic.battery_score,
            "display_score": semantic.display_score,
            "premium_score": semantic.premium_score,
            "chipset_power": product.chipset_power,
            "ram_gb": product.ram_gb or 0,
            "battery_mah_per_1000": battery_mah / 1000,
            "refresh_hz_per_120": (product.refresh_hz or 60) / 120,
            "camera_mp_per_50": (product.camera_mp or 12) / 50,
            "rating": product.rating or 0.0,
            "review_log": math.log1p(product.review_count or 0),
            "price_log": math.log1p(product.price or 0.0),
            "has_created_at": 1.0 if product.created_at else 0.0,
        }

        for feature_name, feature_value in feature_values.items():
            score += feature_value * weights.get(feature_name, 0.0)

        if price_center and product.price and weights.get("price_center_bonus"):
            distance = abs(product.price - price_center) / max(1.0, price_center)
            max_bonus = weights["price_center_bonus"]
            score += max(0.0, max_bonus - max_bonus * distance)

        if battery_mah >= 6000:
            score += weights.get("battery_mah_6000_bonus", 0.0)
        if battery_mah >= 7000:
            score += weights.get("battery_mah_7000_bonus", 0.0)
        if product.camera_mp and product.camera_mp >= 32:
            score += weights.get("camera_mp_32_bonus", 0.0)
        if weights.get("quality_token_bonus") and any(
            token in product.normalized_text for token in self.rules.display_quality_tokens
        ):
            score += weights["quality_token_bonus"]
        if product.price and weights.get("cheapness_bonus"):
            divisor = weights.get("cheapness_log_divisor", 60.0)
            score += max(0.0, weights["cheapness_bonus"] - math.log1p(product.price) / divisor)

        return score

    def _is_followup_query(self, normalized_query: str) -> bool:
        if any(marker in normalized_query for marker in self.rules.followup_markers):
            return True

        tokens = normalized_query.split()
        if not tokens:
            return False

        has_number = any(token.isdigit() for token in tokens)
        if (
            len(tokens) <= 3
            and has_number
            and not self._extract_brand_filters(normalized_query)
            and self._sort_mode(normalized_query) == self.rules.default_sort_mode
        ):
            return True
        return False

    def _infer_history_constraints(
        self,
        history: list[dict[str, str]] | None,
        current_normalized_query: str,
    ) -> dict[str, Any]:
        if not history:
            return {"price": (None, None), "brands": set(), "in_stock": False, "mode": self.rules.default_sort_mode}

        if not self._is_followup_query(current_normalized_query):
            return {"price": (None, None), "brands": set(), "in_stock": False, "mode": self.rules.default_sort_mode}

        inherited_min: float | None = None
        inherited_max: float | None = None
        inherited_in_stock = False
        inherited_mode = self.rules.default_sort_mode

        user_turns = [item for item in reversed(history) if item.get("role") == "user"][:4]
        for item in user_turns:
            if item.get("role") != "user":
                continue
            content = item.get("content", "")
            normalized = normalize_text(content)

            if inherited_min is None and inherited_max is None:
                min_price, max_price = self._extract_price_filter(normalized)
                if min_price is not None or max_price is not None:
                    inherited_min, inherited_max = min_price, max_price

            if not inherited_in_stock:
                inherited_in_stock = self._wants_in_stock(normalized)

            if inherited_mode == self.rules.default_sort_mode:
                mode = self._sort_mode(normalized)
                if mode != self.rules.default_sort_mode:
                    inherited_mode = mode

            if (inherited_min is not None or inherited_max is not None) and inherited_mode != "relevance":
                break

        return {
            "price": (inherited_min, inherited_max),
            "brands": set(),
            "in_stock": inherited_in_stock,
            "mode": inherited_mode,
        }

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        inherited_constraints: dict[str, Any] | None = None,
        intent: SearchIntent | None = None,
        relax_price: bool = False,
        relax_stock: bool = False,
        relax_brand: bool = False,
        price_window_expansion: float | None = None,
        match_type: str = "exact",
        relaxed_constraints: tuple[str, ...] = (),
    ) -> list[dict[str, Any]]:
        if intent:
            semantic_query = " ".join(
                part
                for part in [query, intent.rewritten_query, " ".join(sorted(intent.needs))]
                if part
            )
            normalized_query = normalize_text(semantic_query)
            query_tokens = tokenize(semantic_query, self.rules.stopwords)
            min_price, max_price = intent.min_price, intent.max_price
            brands = set(intent.brands)
            in_stock_only = intent.in_stock_only
            sort_mode = intent.sort_mode
            needs = set(intent.needs)
        else:
            normalized_query = normalize_text(query)
            query_tokens = tokenize(query, self.rules.stopwords)
            min_price, max_price = self._extract_price_filter(normalized_query)
            brands = self._extract_brand_filters(normalized_query)
            in_stock_only = self._wants_in_stock(normalized_query)
            sort_mode = self._sort_mode(normalized_query)
            needs = self._extract_needs(normalized_query)

        if inherited_constraints and not intent:
            inherited_min, inherited_max = inherited_constraints.get("price", (None, None))
            inherited_brands = inherited_constraints.get("brands", set()) or set()
            inherited_in_stock = bool(inherited_constraints.get("in_stock", False))
            inherited_mode = inherited_constraints.get("mode", "relevance")

            if min_price is None and max_price is None:
                min_price, max_price = inherited_min, inherited_max
            if not brands and inherited_brands:
                brands = set(inherited_brands)
            if not in_stock_only and inherited_in_stock:
                in_stock_only = True
            if sort_mode == self.rules.default_sort_mode and inherited_mode != self.rules.default_sort_mode:
                sort_mode = inherited_mode
                needs.add(sort_mode)

        price_center = None
        if min_price is not None and max_price is not None:
            price_center = (min_price + max_price) / 2
        price_reference = price_center or max_price or min_price

        relaxed_min_price = min_price
        relaxed_max_price = max_price
        if relax_price and price_window_expansion is not None and price_reference:
            if relaxed_min_price is not None:
                relaxed_min_price = max(0.0, relaxed_min_price - price_reference * price_window_expansion)
            if relaxed_max_price is not None:
                relaxed_max_price = relaxed_max_price + price_reference * price_window_expansion

        scored: list[dict[str, Any]] = []
        for idx, product in enumerate(self.products):
            brand_matches = not brands or product.brand in brands
            stock_matches = not in_stock_only or product.stock > 0
            has_price_constraint = min_price is not None or max_price is not None

            if brands and not brand_matches and not relax_brand:
                continue
            if in_stock_only and not stock_matches and not relax_stock:
                continue

            if has_price_constraint and product.price is None:
                continue
            if (
                product.price is not None
                and product.price < self.rules.min_recommendable_price_vnd
            ):
                continue
            if not relax_price or price_window_expansion is not None:
                if (
                    relaxed_min_price is not None
                    and product.price is not None
                    and product.price < relaxed_min_price
                ):
                    continue
                if (
                    relaxed_max_price is not None
                    and product.price is not None
                    and product.price > relaxed_max_price
                ):
                    continue

            score = self._bm25_score(query_tokens, idx)

            ranking = self.rules.ranking
            if product.stock > 0:
                score += ranking.stock_bonus
            elif in_stock_only and relax_stock:
                score -= ranking.relaxed_stock_penalty
            if product.rating is not None:
                score += product.rating * ranking.rating_multiplier
            if query_tokens and normalize_text(product.name).find(" ".join(query_tokens[:2])) >= 0:
                score += ranking.name_phrase_bonus
            if brands:
                if brand_matches:
                    score += ranking.brand_match_bonus
                elif relax_brand:
                    score -= ranking.relaxed_brand_penalty

            score += self._score_weighted_features(
                product=product,
                weights=ranking.sort_mode_weights.get(sort_mode, {}),
                price_center=price_reference,
            )

            for need in needs:
                score += self._score_weighted_features(
                    product=product,
                    weights=ranking.need_weights.get(need, {}),
                    price_center=price_reference,
                )

            if price_reference and product.price:
                distance = abs(product.price - price_reference) / max(1.0, price_reference)
                if relax_price:
                    near_budget_bonus = ranking.relaxed_price_near_budget_bonus
                    score += max(0.0, near_budget_bonus - near_budget_bonus * distance)
                    score -= distance * ranking.relaxed_price_distance_penalty
                    if max_price is not None and product.price > max_price:
                        over_budget = (product.price - max_price) / max(1.0, price_reference)
                        score -= over_budget * ranking.relaxed_price_distance_penalty
                    if min_price is not None and product.price < min_price:
                        under_budget = (min_price - product.price) / max(1.0, price_reference)
                        score -= under_budget * ranking.relaxed_price_distance_penalty * 0.5
                else:
                    # Bias ranking toward products closer to the target budget.
                    # This avoids pushing outliers that are still inside a wide around-range.
                    score -= distance * ranking.price_distance_penalty

            if score <= 0:
                score = ranking.minimum_positive_score

            scored.append(
                {
                    "product": product,
                    "score": score,
                    "match_type": match_type,
                    "relaxed_constraints": list(relaxed_constraints),
                }
            )

        if sort_mode == "price_asc":
            scored.sort(
                key=lambda item: (
                    float("inf") if item["product"].price is None else item["product"].price,
                    -item["score"],
                )
            )
        elif sort_mode == "newest":
            scored.sort(
                key=lambda item: (
                    item["product"].created_at or "",
                    item["score"],
                ),
                reverse=True,
            )
        else:
            scored.sort(key=lambda item: item["score"], reverse=True)

        unique_results: list[dict[str, Any]] = []
        seen_keys: set[str] = set()
        for item in scored:
            raw_name_key = normalize_text(item["product"].name)
            if self.rules.dedupe_noise_tokens:
                noise_pattern = "|".join(re.escape(token) for token in self.rules.dedupe_noise_tokens)
                name_key = re.sub(rf"\b({noise_pattern})\b", " ", raw_name_key)
            else:
                name_key = raw_name_key
            name_key = re.sub(r"\b\d{2,4}\s*(gb|tb)\b", " ", name_key)
            name_key = re.sub(r"\s+", " ", name_key).strip() or raw_name_key
            if name_key in seen_keys:
                continue
            seen_keys.add(name_key)
            unique_results.append(item)
            if len(unique_results) >= top_k:
                break

        return unique_results

    def _retrieve_with_fallback(
        self,
        query: str,
        top_k: int,
        intent: SearchIntent,
    ) -> tuple[list[dict[str, Any]], RetrievalInfo]:
        matches = self.retrieve(
            query,
            top_k=top_k,
            intent=intent,
            match_type="exact",
        )
        if matches:
            return matches, RetrievalInfo(mode="exact")

        for step in self.rules.relaxation_steps:
            matches = self.retrieve(
                query,
                top_k=top_k,
                intent=intent,
                relax_price=step.relax_price,
                relax_stock=step.relax_stock,
                relax_brand=step.relax_brand,
                price_window_expansion=step.price_window_expansion,
                match_type=step.mode,
                relaxed_constraints=step.relaxed_constraints,
            )
            if matches:
                return matches, RetrievalInfo(
                    mode=step.mode,
                    relaxed_constraints=step.relaxed_constraints,
                )

        return [], RetrievalInfo(mode="empty")

    def _product_payload(self, product: ProductDoc) -> dict[str, Any]:
        return {
            "id": product.id,
            "name": product.name,
            "brand": product.brand,
            "price": product.price,
            "price_text": format_price_vnd(product.price),
            "rating": product.rating,
            "stock": product.stock,
            "ram": product.ram,
            "rom": product.rom,
            "battery": product.battery,
            "review_count": product.review_count,
            "refresh_hz": product.refresh_hz,
            "camera_mp": product.camera_mp,
            "feature_source": product.semantic_features.source if product.semantic_features else None,
        }

    def _product_context(
        self,
        product: ProductDoc,
        score: float,
        match_type: str = "exact",
        relaxed_constraints: list[str] | None = None,
    ) -> dict[str, Any]:
        payload = self._product_payload(product)
        payload.update(
            {
                "score": round(score, 4),
                "match_type": match_type,
                "relaxed_constraints": relaxed_constraints or [],
                "description": compact_product_text(product.description, max_chars=260),
                "specs": compact_product_text(product.specs, max_chars=360),
                "reviews": compact_product_text(product.reviews, max_chars=180),
                "chipset_power": product.chipset_power,
                "feature_scores": product.semantic_features.to_dict() if product.semantic_features else None,
            }
        )
        return payload

    def _build_llm_answer(
        self,
        query: str,
        history: list[dict[str, str]] | None,
        intent: SearchIntent,
        matches: list[dict[str, Any]],
        retrieval_info: RetrievalInfo,
    ) -> str | None:
        if not self.llm_enabled or not self.llm_client or self.llm_quota_limited:
            return None

        product_context = [
            self._product_context(
                item["product"],
                item["score"],
                match_type=item.get("match_type", "exact"),
                relaxed_constraints=item.get("relaxed_constraints", []),
            )
            for item in matches[:5]
        ]
        retrieval_context = retrieval_info.to_public_dict()
        prompt = f"""
Bạn là tư vấn viên bán {self.rules.domain_label} của {self.rules.assistant_name}.
Hãy trả lời bằng tiếng Việt tự nhiên, ngắn gọn, hữu ích.

Quy tắc bắt buộc:
- Chỉ dùng dữ liệu sản phẩm trong JSON bên dưới; không tự bịa giá, tồn kho, thông số.
- Nếu thông số nào thiếu, nói "chưa có dữ liệu" thay vì đoán.
- Chỉ hỏi lại người dùng khi JSON sản phẩm rỗng.
- Ưu tiên giải thích vì sao sản phẩm hợp với nhu cầu, không chỉ liệt kê.
- Không dùng bảng markdown.

Câu hỏi hiện tại: {query}
Lịch sử gần đây: {self._history_preview(history)}
Intent đã phân tích: {json.dumps(intent.to_public_dict(), ensure_ascii=False)}
Sản phẩm truy xuất từ database: {json.dumps(product_context, ensure_ascii=False)}

Trả lời trong 4-8 câu. Có thể dùng bullet ngắn nếu cần.
"""
        prompt += f"""

Lưu ý thêm về kết quả truy xuất:
- Retrieval metadata: {json.dumps(retrieval_context, ensure_ascii=False)}
- Nếu JSON sản phẩm không rỗng, bắt buộc đề xuất sản phẩm tốt nhất trong JSON; không trả lời rằng không có sản phẩm để đề xuất.
- Nếu retrieval mode không phải "exact", hãy nói rõ chưa có mẫu khớp chính xác toàn bộ điều kiện, sau đó tư vấn các mẫu gần nhất đã truy xuất.
- Khi phải nói điều kiện bị nới lỏng, hãy gợi ý tăng ngân sách hoặc giảm yêu cầu, nhưng vẫn ưu tiên sản phẩm cụ thể trong JSON.
"""

        answer = self.llm_client.generate_text(
            prompt,
            temperature=0.35,
            max_output_tokens=700,
        )
        return compact_product_text(answer, max_chars=1800) if answer else None

    def _build_relaxed_answer(
        self,
        matches: list[dict[str, Any]],
        retrieval_info: RetrievalInfo,
    ) -> str:
        top = matches[0]["product"]
        lines = [
            (
                "Mình chưa thấy mẫu khớp chính xác toàn bộ yêu cầu, "
                f"nhưng có {len(matches)} lựa chọn gần nhất để bạn cân nhắc."
            ),
            "",
            "Gợi ý gần nhất:",
            (
                f"- {top.name} ({top.brand}) - {format_price_vnd(top.price)}, "
                f"RAM {top.ram or 'N/A'}, ROM {top.rom or 'N/A'}, "
                f"pin {top.battery or 'N/A'}, tồn kho {top.stock}."
            ),
        ]

        if len(matches) > 1:
            lines.extend(["", "Các lựa chọn thay thế:"])
            for item in matches[1:]:
                product = item["product"]
                lines.append(
                    f"- {product.name}: {format_price_vnd(product.price)} | "
                    f"RAM {product.ram or 'N/A'} | ROM {product.rom or 'N/A'} | "
                    f"pin {product.battery or 'N/A'} | tồn kho {product.stock}."
                )

        relaxed = set(retrieval_info.relaxed_constraints)
        suggestions: list[str] = []
        if "price" in relaxed:
            suggestions.append("tăng ngân sách một chút")
        if "brand" in relaxed:
            suggestions.append("mở rộng thêm thương hiệu")
        if "stock" in relaxed:
            suggestions.append("bỏ điều kiện còn hàng nếu bạn có thể chờ nhập lại")
        if not suggestions:
            suggestions.append("giảm bớt một vài yêu cầu ưu tiên")

        lines.extend(
            [
                "",
                "Để có lựa chọn sát hơn nữa, bạn có thể "
                + ", ".join(suggestions)
                + ".",
            ]
        )
        return "\n".join(lines)

    def _build_answer(self, matches: list[dict[str, Any]], retrieval_info: RetrievalInfo | None = None) -> str:
        retrieval_info = retrieval_info or RetrievalInfo(mode="exact")
        if matches and retrieval_info.is_relaxed:
            return self._build_relaxed_answer(matches, retrieval_info)

        if not matches:
            return (
                "Hiện mình chưa tìm thấy sản phẩm phù hợp chính xác với yêu cầu này trong dữ liệu đang bán. "
                "Bạn có thể nói rõ thêm về tầm giá, hãng hoặc nhu cầu như camera/chơi game/pin để mình lọc chuẩn hơn."
            )

        top = matches[0]["product"]
        lines: list[str] = []
        lines.append(f"Mình đã tìm thấy {len(matches)} mẫu phù hợp với câu hỏi của bạn.")
        lines.append("")
        lines.append("Gợi ý nổi bật nhất:")
        lines.append(
            f"- {top.name} ({top.brand}) - {format_price_vnd(top.price)}, "
            f"RAM {top.ram or 'N/A'}, ROM {top.rom or 'N/A'}, pin {top.battery or 'N/A'}, "
            f"đánh giá {top.rating or 0}/5."
        )

        if len(matches) > 1:
            lines.append("")
            lines.append("Các mẫu bạn có thể cân nhắc thêm:")

            for item in matches[1:]:
                product = item["product"]
                lines.append(
                    f"- {product.name}: {format_price_vnd(product.price)} | "
                    f"RAM {product.ram or 'N/A'} | ROM {product.rom or 'N/A'} | "
                    f"pin {product.battery or 'N/A'} | tồn kho {product.stock}."
                )
        else:
            lines.append("")
            lines.append("Hiện trong tầm ngân sách này, đây là mẫu nổi bật nhất theo dữ liệu đang có.")

        lines.append("")
        lines.append(
            "Nếu bạn muốn, mình có thể tư vấn tiếp theo nhu cầu cụ thể như chụp ảnh, chơi game, pin trâu hoặc ưu tiên màn hình đẹp."
        )
        return "\n".join(lines)

    def _stats_answer_if_needed(self, normalized_query: str) -> str | None:
        if any(key in normalized_query for key in ["bao nhieu san pham", "co bao nhieu dien thoai"]):
            return f"Hiện hệ thống có {self.total_products} mẫu {self.rules.domain_label} đang được index để tư vấn."
        if "hang nao" in normalized_query and "ban" in normalized_query:
            brands = sorted({product.brand for product in self.products if product.brand})
            return "Các hãng đang có trong dữ liệu: " + ", ".join(brands) + "."
        return None

    def _busy_response(self) -> dict[str, Any]:
        return {
            "answer": (
                "Server tư vấn đang bận chuẩn bị dữ liệu sản phẩm. "
                "Bạn vui lòng quay lại sau ít phút nhé."
            ),
            "products": [],
            "sources": [],
            "intent": {},
            "retrieval": {
                "mode": "feature_unavailable",
                "relaxed_constraints": [],
                "is_relaxed": False,
            },
            "llm": {
                "enabled": self.llm_enabled,
                "used": False,
                "model": self.llm_model,
                "error": self.llm_last_error or self.feature_error,
                "quota_limited": self.llm_quota_limited,
            },
            "feature_status": {
                "ready": False,
                "missing": self.missing_feature_count,
                "sources": self.feature_sources,
                "error": self.feature_error,
            },
        }

    def answer(self, query: str, history: list[dict[str, str]] | None = None, top_k: int = 5) -> dict[str, Any]:
        normalized_query = normalize_text(query)
        quick_answer = self._stats_answer_if_needed(normalized_query)
        if quick_answer:
            return {
                "answer": quick_answer,
                "products": [],
                "sources": [],
                "intent": {},
                "retrieval": RetrievalInfo(mode="stats").to_public_dict(),
                "feature_status": {
                    "ready": self.features_ready,
                    "missing": self.missing_feature_count,
                    "sources": self.feature_sources,
                    "error": self.feature_error,
                },
                "llm": {
                    "enabled": self.llm_enabled,
                    "used": False,
                    "model": self.llm_model,
                    "error": self.llm_last_error,
                    "quota_limited": self.llm_quota_limited,
                },
        }

        if not self.features_ready:
            return self._busy_response()

        intent = self._build_search_intent(query, history)
        matches, retrieval_info = self._retrieve_with_fallback(query, top_k=top_k, intent=intent)
        llm_answer = self._build_llm_answer(query, history, intent, matches, retrieval_info)
        answer = llm_answer or self._build_answer(matches, retrieval_info)
        products = [self._product_payload(item["product"]) for item in matches]
        sources = [
            {
                "table": "phones",
                "id": item["product"].id,
                "name": item["product"].name,
                "score": round(item["score"], 4),
                "match_type": item.get("match_type", retrieval_info.mode),
                "relaxed_constraints": item.get("relaxed_constraints", []),
            }
            for item in matches
        ]
        return {
            "answer": answer,
            "products": products,
            "sources": sources,
            "intent": intent.to_public_dict(),
            "retrieval": retrieval_info.to_public_dict(),
            "feature_status": {
                "ready": True,
                "missing": 0,
                "sources": self.feature_sources,
                "error": self.feature_error,
            },
            "llm": {
                "enabled": self.llm_enabled,
                "used": bool(llm_answer),
                "model": self.llm_model,
                "error": None if llm_answer else self.llm_last_error,
                "quota_limited": self.llm_quota_limited,
            },
        }
