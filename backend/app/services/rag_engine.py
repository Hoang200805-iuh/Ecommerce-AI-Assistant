from __future__ import annotations

import math
import re
import sqlite3
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any


STOPWORDS = {
    "la",
    "va",
    "cho",
    "cua",
    "toi",
    "minh",
    "ban",
    "co",
    "khong",
    "nhe",
    "nha",
    "giup",
    "tu",
    "den",
    "trong",
    "voi",
    "nay",
    "do",
    "dang",
    "can",
    "muon",
    "dien",
    "thoai",
    "san",
    "pham",
    "web",
    "shop",
    "top",
}

BRAND_ALIASES = {
    "iphone": "Apple",
    "ios": "Apple",
    "galaxy": "Samsung",
    "redmi": "Xiaomi",
    "mi": "Xiaomi",
    "oppo": "OPPO",
    "vivo": "vivo",
    "realme": "Realme",
    "rog": "ASUS",
    "zenfone": "ASUS",
    "poco": "Xiaomi",
}

GAME_QUERY_KEYWORDS = {
    "game",
    "choi game",
    "pubg",
    "lien quan",
    "genshin",
    "fps",
    "mooba",
}

CAMERA_QUERY_KEYWORDS = {
    "camera",
    "chup anh",
    "selfie",
    "quay video",
    "xoa phong",
}

FOLLOWUP_QUERY_MARKERS = {
    "thi sao",
    "thi s",
    "sao",
    "di",
    "nua",
    "du",
    "thoi",
    "roi sao",
}

NOISE_MARKERS = [
    "noi dung chinh",
    "dong xem ket qua",
    "bo loc",
    "sap xep theo",
    "mot vai cau hoi thuong gap",
    "mua iphone",
    "gia bao nhieu tien",
]

CHIPSET_HINT_SCORES = {
    "snapdragon 8 elite": 5.0,
    "snapdragon 8": 4.5,
    "snapdragon 7": 3.7,
    "dimensity 9400": 4.7,
    "dimensity 9300": 4.6,
    "dimensity 9": 4.3,
    "dimensity 8": 3.7,
    "apple a19": 4.8,
    "apple a18": 4.5,
    "apple a17": 4.2,
    "apple a16": 4.0,
    "apple a15": 3.7,
    "exynos 2400": 4.2,
    "exynos 1480": 3.6,
    "tensor g4": 4.1,
}


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


def tokenize(text: str | None) -> list[str]:
    normalized = normalize_text(text)
    if not normalized:
        return []
    return [
        token
        for token in normalized.split()
        if token not in STOPWORDS and (len(token) > 1 or token.isdigit())
    ]


def compact_product_text(text: str | None, max_chars: int) -> str:
    if not text:
        return ""

    compact = re.sub(r"\s+", " ", text).strip()
    compact_norm = normalize_text(compact)

    for marker in NOISE_MARKERS:
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


def parse_money_value(number_text: str, unit: str | None) -> float:
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

    unit = (unit or "").strip().lower()
    if unit in {"ty", "ti"}:
        return value * 1_000_000_000
    if unit in {"trieu", "tr"}:
        return value * 1_000_000
    if unit in {"k", "nghin", "ngan"}:
        return value * 1_000
    if value <= 300:
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

    score = 0.0
    for hint, value in CHIPSET_HINT_SCORES.items():
        if hint in normalized:
            score = max(score, value)

    if score > 0:
        return score

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
    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        self.products: list[ProductDoc] = []
        self.term_freqs: list[Counter[str]] = []
        self.doc_len: list[int] = []
        self.df: Counter[str] = Counter()
        self.avg_doc_len: float = 0.0
        self.brands_map: dict[str, str] = {}
        self.reload()

    def reload(self) -> None:
        self.products = self._load_products()
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
              created_at
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
            tokens = tokenize(searchable_text)

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
                )
            )
        return docs

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

    def _extract_price_filter(self, normalized_query: str) -> tuple[float | None, float | None]:
        number = r"(\d+(?:[.,]\d+)?)"
        unit = r"(?:\s*(ty|ti|trieu|tr|k|nghin|ngan))?"
        budget_prefix = r"(?:gia|muc gia|tam gia|ngan sach|tam tien)?\s*"

        range_pattern = re.search(
            rf"(?:tu)\s+{budget_prefix}{number}{unit}\s+(?:den|toi)\s+{budget_prefix}{number}{unit}",
            normalized_query,
        )
        if range_pattern:
            low = parse_money_value(range_pattern.group(1), range_pattern.group(2))
            high = parse_money_value(range_pattern.group(3), range_pattern.group(4))
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
                center = parse_money_value(around.group(1), around.group(2))
                margin = max(600_000.0, center * 0.10)
                return round(center - margin), round(center + margin)

        # Short follow-up queries often look like "6 tr thi sao", "7tr di".
        # If user gives exactly one explicit money amount, treat it as target budget.
        explicit_money_matches = list(
            re.finditer(r"\b(\d+(?:[.,]\d+)?)\s*(ty|ti|trieu|tr|k|nghin|ngan)\b", normalized_query)
        )
        if len(explicit_money_matches) == 1:
            has_compare_keyword = any(
                key in normalized_query
                for key in ["tu ", " den ", " toi ", "duoi", "tren", "hon", "khong qua", "toi da", "max", "min"]
            )
            if not has_compare_keyword:
                match = explicit_money_matches[0]
                center = parse_money_value(match.group(1), match.group(2))
                margin = max(600_000.0, center * 0.10)
                return round(center - margin), round(center + margin)

        # Bare-number follow-up such as "19 thi sao", "7 di".
        if not explicit_money_matches:
            bare_numbers = list(re.finditer(r"\b(\d{1,3}(?:[.,]\d+)?)\b", normalized_query))
            if len(bare_numbers) == 1:
                has_followup_marker = any(marker in normalized_query for marker in FOLLOWUP_QUERY_MARKERS)
                has_budget_keyword = any(
                    key in normalized_query
                    for key in ["gia", "tam", "muc", "ngan sach", "tien"]
                )
                if has_followup_marker or has_budget_keyword:
                    center = parse_money_value(bare_numbers[0].group(1), "tr")
                    margin = max(600_000.0, center * 0.10)
                    return round(center - margin), round(center + margin)

        upper_pattern = re.search(
            rf"(?:duoi|nho hon|khong qua|toi da|max)\s+(?:gia|tien)?\s*{number}{unit}",
            normalized_query,
        )
        if upper_pattern:
            return None, parse_money_value(upper_pattern.group(1), upper_pattern.group(2))

        lower_pattern = re.search(
            rf"(?:tren|hon|toi thieu|min)\s+(?:gia|tien)?\s*{number}{unit}",
            normalized_query,
        )
        if lower_pattern:
            return parse_money_value(lower_pattern.group(1), lower_pattern.group(2)), None

        return None, None

    def _extract_brand_filters(self, normalized_query: str) -> set[str]:
        matched_brands: set[str] = set()
        for normalized_brand, original_brand in self.brands_map.items():
            if normalized_brand and normalized_brand in normalized_query:
                matched_brands.add(original_brand)
        for alias, brand in BRAND_ALIASES.items():
            if alias in normalized_query:
                matched_brands.add(brand)
        return matched_brands

    def _wants_in_stock(self, normalized_query: str) -> bool:
        return any(
            key in normalized_query
            for key in ["con hang", "ton kho", "san co", "mua duoc", "co san"]
        )

    def _wants_gaming(self, normalized_query: str) -> bool:
        return any(key in normalized_query for key in GAME_QUERY_KEYWORDS)

    def _wants_camera(self, normalized_query: str) -> bool:
        return any(key in normalized_query for key in CAMERA_QUERY_KEYWORDS)

    def _sort_mode(self, normalized_query: str) -> str:
        if self._wants_gaming(normalized_query):
            return "gaming"
        if self._wants_camera(normalized_query):
            return "camera"
        if any(key in normalized_query for key in ["re nhat", "gia re", "tiet kiem"]):
            return "price_asc"
        if any(key in normalized_query for key in ["cao cap", "tot nhat", "manh nhat", "flagship"]):
            return "premium"
        if any(key in normalized_query for key in ["moi nhat", "new"]):
            return "newest"
        return "relevance"

    def _is_followup_query(self, normalized_query: str) -> bool:
        if any(marker in normalized_query for marker in FOLLOWUP_QUERY_MARKERS):
            return True

        tokens = normalized_query.split()
        if not tokens:
            return False

        has_number = any(token.isdigit() for token in tokens)
        if (
            len(tokens) <= 3
            and has_number
            and not self._extract_brand_filters(normalized_query)
            and self._sort_mode(normalized_query) == "relevance"
        ):
            return True
        return False

    def _infer_history_constraints(
        self,
        history: list[dict[str, str]] | None,
        current_normalized_query: str,
    ) -> dict[str, Any]:
        if not history:
            return {"price": (None, None), "brands": set(), "in_stock": False, "mode": "relevance"}

        if not self._is_followup_query(current_normalized_query):
            return {"price": (None, None), "brands": set(), "in_stock": False, "mode": "relevance"}

        inherited_min: float | None = None
        inherited_max: float | None = None
        inherited_in_stock = False
        inherited_mode = "relevance"

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

            if inherited_mode == "relevance":
                mode = self._sort_mode(normalized)
                if mode != "relevance":
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
    ) -> list[dict[str, Any]]:
        normalized_query = normalize_text(query)
        query_tokens = tokenize(query)
        min_price, max_price = self._extract_price_filter(normalized_query)
        brands = self._extract_brand_filters(normalized_query)
        in_stock_only = self._wants_in_stock(normalized_query)
        sort_mode = self._sort_mode(normalized_query)

        if inherited_constraints:
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
            if sort_mode == "relevance" and inherited_mode != "relevance":
                sort_mode = inherited_mode

        price_center = None
        if min_price is not None and max_price is not None:
            price_center = (min_price + max_price) / 2

        scored: list[dict[str, Any]] = []
        for idx, product in enumerate(self.products):
            if brands and product.brand not in brands:
                continue
            if in_stock_only and product.stock <= 0:
                continue

            if (min_price is not None or max_price is not None) and product.price is None:
                continue
            if min_price is not None and product.price is not None and product.price < min_price:
                continue
            if max_price is not None and product.price is not None and product.price > max_price:
                continue

            score = self._bm25_score(query_tokens, idx)

            if product.stock > 0:
                score += 0.05
            if product.rating is not None:
                score += product.rating * 0.03
            if query_tokens and normalize_text(product.name).find(" ".join(query_tokens[:2])) >= 0:
                score += 0.1
            if brands and product.brand in brands:
                score += 0.2

            if sort_mode == "gaming":
                score += product.chipset_power * 0.55
                score += (product.ram_gb or 0) * 0.24
                score += (product.battery_mah or 4500) / 1000 * 0.16
                score += (product.refresh_hz or 60) / 120 * 0.35

                if "pubg" in normalized_query:
                    if (product.refresh_hz or 0) >= 120:
                        score += 0.4
                    if (product.ram_gb or 0) >= 8:
                        score += 0.3
                if price_center and product.price:
                    distance = abs(product.price - price_center) / max(1.0, price_center)
                    score += max(0.0, 0.45 - 0.45 * distance)
            elif sort_mode == "camera":
                score += (product.camera_mp or 12) / 50 * 0.45
                score += (product.rating or 0.0) * 0.35
                score += math.log1p(product.review_count or 0) * 0.18
                if "selfie" in normalized_query and product.camera_mp and product.camera_mp >= 32:
                    score += 0.25
                if price_center and product.price:
                    distance = abs(product.price - price_center) / max(1.0, price_center)
                    score += max(0.0, 0.35 - 0.35 * distance)
            elif sort_mode == "premium":
                score += (product.rating or 0.0) * 0.45
                score += math.log1p(product.price or 0.0) * 0.12
            elif sort_mode == "newest":
                if product.created_at:
                    score += 0.15

            if price_center and product.price:
                # Bias ranking toward products closer to the target budget.
                # This avoids pushing outliers that are still inside a wide around-range.
                distance = abs(product.price - price_center) / max(1.0, price_center)
                score -= distance * 0.35

            if score <= 0:
                score = 0.01

            scored.append({"product": product, "score": score})

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
            name_key = re.sub(r"\b(chinh hang|vn a)\b", " ", raw_name_key)
            name_key = re.sub(r"\b\d{2,4}\s*(gb|tb)\b", " ", name_key)
            name_key = re.sub(r"\s+", " ", name_key).strip() or raw_name_key
            if name_key in seen_keys:
                continue
            seen_keys.add(name_key)
            unique_results.append(item)
            if len(unique_results) >= top_k:
                break

        return unique_results

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
        }

    def _build_answer(self, matches: list[dict[str, Any]]) -> str:
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
            return f"Hiện hệ thống có {self.total_products} mẫu điện thoại đang được index để tư vấn."
        if "hang nao" in normalized_query and "ban" in normalized_query:
            brands = sorted({product.brand for product in self.products if product.brand})
            return "Các hãng đang có trong dữ liệu: " + ", ".join(brands) + "."
        return None

    def answer(self, query: str, history: list[dict[str, str]] | None = None, top_k: int = 5) -> dict[str, Any]:
        normalized_query = normalize_text(query)
        quick_answer = self._stats_answer_if_needed(normalized_query)
        if quick_answer:
            return {
                "answer": quick_answer,
                "products": [],
                "sources": [],
            }

        inherited_constraints = self._infer_history_constraints(history, normalized_query)
        matches = self.retrieve(
            query,
            top_k=top_k,
            inherited_constraints=inherited_constraints,
        )
        answer = self._build_answer(matches)
        products = [self._product_payload(item["product"]) for item in matches]
        sources = [
            {
                "table": "phones",
                "id": item["product"].id,
                "name": item["product"].name,
                "score": round(item["score"], 4),
            }
            for item in matches
        ]
        return {
            "answer": answer,
            "products": products,
            "sources": sources,
        }
