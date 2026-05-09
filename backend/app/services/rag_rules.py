from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class NeedRule:
    name: str
    keywords: frozenset[str]
    implies: frozenset[str] = field(default_factory=frozenset)


@dataclass(frozen=True)
class SortRule:
    mode: str
    keywords: frozenset[str]
    needs: frozenset[str] = field(default_factory=frozenset)


@dataclass(frozen=True)
class RankingWeights:
    stock_bonus: float = 0.05
    rating_multiplier: float = 0.03
    name_phrase_bonus: float = 0.10
    brand_match_bonus: float = 0.20
    price_distance_penalty: float = 0.35
    relaxed_price_near_budget_bonus: float = 0.75
    relaxed_price_distance_penalty: float = 2.20
    relaxed_stock_penalty: float = 0.45
    relaxed_brand_penalty: float = 0.60
    minimum_positive_score: float = 0.01
    sort_mode_weights: dict[str, dict[str, float]] = field(default_factory=dict)
    need_weights: dict[str, dict[str, float]] = field(default_factory=dict)


@dataclass(frozen=True)
class RelaxationStep:
    mode: str
    relaxed_constraints: tuple[str, ...]
    relax_price: bool = False
    relax_stock: bool = False
    relax_brand: bool = False
    price_window_expansion: float | None = None


@dataclass(frozen=True)
class RAGRules:
    assistant_name: str
    domain_label: str
    default_sort_mode: str
    stopwords: frozenset[str]
    brand_aliases: dict[str, str]
    followup_markers: frozenset[str]
    noise_markers: tuple[str, ...]
    in_stock_keywords: frozenset[str]
    compare_keywords: frozenset[str]
    budget_keywords: frozenset[str]
    money_unit_multipliers: dict[str, float]
    implicit_million_threshold: float
    min_recommendable_price_vnd: float
    sort_rules: tuple[SortRule, ...]
    need_rules: tuple[NeedRule, ...]
    relaxation_steps: tuple[RelaxationStep, ...]
    ranking: RankingWeights
    display_quality_tokens: frozenset[str]
    dedupe_noise_tokens: frozenset[str]

    @property
    def allowed_sort_modes(self) -> frozenset[str]:
        return frozenset({self.default_sort_mode, *(rule.mode for rule in self.sort_rules)})

    @property
    def allowed_needs(self) -> frozenset[str]:
        needs: set[str] = set()
        for rule in self.need_rules:
            needs.add(rule.name)
            needs.update(rule.implies)
        for rule in self.sort_rules:
            needs.update(rule.needs)
        return frozenset(needs)


DEFAULT_RAG_RULES = RAGRules(
    assistant_name="SmartMobile",
    domain_label="dien thoai",
    default_sort_mode="relevance",
    stopwords=frozenset(
        {
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
    ),
    brand_aliases={
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
    },
    followup_markers=frozenset({"thi sao", "thi s", "sao", "di", "nua", "du", "thoi", "roi sao"}),
    noise_markers=(
        "noi dung chinh",
        "dong xem ket qua",
        "bo loc",
        "sap xep theo",
        "mot vai cau hoi thuong gap",
        "mua iphone",
        "gia bao nhieu tien",
    ),
    in_stock_keywords=frozenset({"con hang", "ton kho", "san co", "mua duoc", "co san"}),
    compare_keywords=frozenset({"tu ", " den ", " toi ", "duoi", "tren", "hon", "khong qua", "toi da", "max", "min"}),
    budget_keywords=frozenset({"gia", "tam", "muc", "ngan sach", "tien"}),
    money_unit_multipliers={
        "ty": 1_000_000_000,
        "ti": 1_000_000_000,
        "trieu": 1_000_000,
        "tr": 1_000_000,
        "cu": 1_000_000,
        "chai": 1_000_000,
        "k": 1_000,
        "nghin": 1_000,
        "ngan": 1_000,
    },
    implicit_million_threshold=300,
    min_recommendable_price_vnd=500_000,
    sort_rules=(
        SortRule("gaming", frozenset({"game", "choi game", "pubg", "lien quan", "genshin", "fps", "mooba"}), frozenset({"gaming", "performance"})),
        SortRule("camera", frozenset({"camera", "chup anh", "selfie", "quay video", "xoa phong"}), frozenset({"camera"})),
        SortRule("price_asc", frozenset({"re nhat", "gia re", "tiet kiem"}), frozenset({"budget"})),
        SortRule("premium", frozenset({"cao cap", "tot nhat", "manh nhat", "flagship"}), frozenset({"premium"})),
        SortRule("newest", frozenset({"moi nhat", "new"})),
    ),
    need_rules=(
        NeedRule("gaming", frozenset({"game", "choi game", "pubg", "lien quan", "genshin", "fps", "mooba"}), frozenset({"performance"})),
        NeedRule("camera", frozenset({"camera", "chup anh", "quay video", "xoa phong"})),
        NeedRule("selfie", frozenset({"selfie"}), frozenset({"camera"})),
        NeedRule("battery", frozenset({"pin", "pin trau", "lau het pin", "dung lau", "thoi luong pin"})),
        NeedRule("display", frozenset({"man hinh", "display", "oled", "amoled", "120hz", "tan so quet"})),
        NeedRule("performance", frozenset({"manh", "hieu nang", "chip", "da nhiem", "muot"})),
        NeedRule("budget", frozenset({"re nhat", "gia re", "tiet kiem", "duoi", "ngan sach"})),
        NeedRule("premium", frozenset({"cao cap", "flagship", "tot nhat"})),
    ),
    relaxation_steps=(
        RelaxationStep(
            mode="near_budget",
            relaxed_constraints=("price",),
            relax_price=True,
            price_window_expansion=0.30,
        ),
        RelaxationStep(
            mode="near_budget_or_stock",
            relaxed_constraints=("price", "stock"),
            relax_price=True,
            relax_stock=True,
            price_window_expansion=0.50,
        ),
        RelaxationStep(
            mode="closest_match",
            relaxed_constraints=("price", "stock", "brand"),
            relax_price=True,
            relax_stock=True,
            relax_brand=True,
        ),
    ),
    ranking=RankingWeights(
        sort_mode_weights={
            "gaming": {
                "gaming_score": 1.20,
                "performance_score": 0.75,
                "display_score": 0.30,
                "battery_score": 0.25,
                "ram_gb": 0.08,
                "price_center_bonus": 0.45,
            },
            "camera": {
                "camera_score": 1.20,
                "rating": 0.18,
                "review_log": 0.18,
                "price_center_bonus": 0.35,
            },
            "premium": {
                "premium_score": 1.15,
                "performance_score": 0.35,
                "rating": 0.20,
                "price_log": 0.12,
            },
            "newest": {
                "has_created_at": 0.15,
            },
        },
        need_weights={
            "performance": {"performance_score": 1.00, "ram_gb": 0.08},
            "battery": {"battery_score": 1.10, "battery_mah_6000_bonus": 0.35, "battery_mah_7000_bonus": 0.20},
            "display": {"display_score": 1.00, "quality_token_bonus": 0.20},
            "selfie": {"camera_score": 0.55, "camera_mp_32_bonus": 0.20},
            "budget": {"cheapness_bonus": 0.35, "cheapness_log_divisor": 60.0},
        },
    ),
    display_quality_tokens=frozenset({"oled", "amoled", "retina"}),
    dedupe_noise_tokens=frozenset({"chinh hang", "vn a"}),
)
