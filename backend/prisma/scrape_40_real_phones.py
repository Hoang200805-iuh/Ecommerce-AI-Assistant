#!/usr/bin/env python3
"""Scrape real phones and a few laptops from cellphones.com.vn and save them into phones.db."""

from __future__ import annotations

import re
import sqlite3
import time
from urllib.parse import urljoin, urlparse

from playwright.sync_api import sync_playwright


BASE_URL = "https://cellphones.com.vn"
DB_PATH = r"c:\Users\as\Downloads\SmartPhone E-comere\backend\prisma\phones.db"
PHONE_TARGET_COUNT = 40
LAPTOP_TARGET_COUNT = 5
TARGET_COUNT = PHONE_TARGET_COUNT + LAPTOP_TARGET_COUNT

PHONE_SOURCE_URLS = [
    "https://cellphones.com.vn/",
    "https://cellphones.com.vn/mobile/apple.html",
    "https://cellphones.com.vn/mobile/samsung.html",
    "https://cellphones.com.vn/mobile/xiaomi.html",
    "https://cellphones.com.vn/mobile/oppo.html",
    "https://cellphones.com.vn/mobile/vivo.html",
    "https://cellphones.com.vn/mobile/honor.html",
    "https://cellphones.com.vn/mobile/tecno.html",
    "https://cellphones.com.vn/mobile/realme.html",
    "https://cellphones.com.vn/mobile/nothing-phone.html",
    "https://cellphones.com.vn/mobile/nubia.html",
    "https://cellphones.com.vn/mobile/sony.html",
    "https://cellphones.com.vn/mobile/motorola.html",
]

LAPTOP_SOURCE_URLS = [
    "https://cellphones.com.vn/laptop.html",
    "https://cellphones.com.vn/laptop/mac.html",
    "https://cellphones.com.vn/laptop/asus.html",
    "https://cellphones.com.vn/laptop/lenovo.html",
    "https://cellphones.com.vn/laptop/msi.html",
    "https://cellphones.com.vn/laptop/acer.html",
    "https://cellphones.com.vn/laptop/hp.html",
    "https://cellphones.com.vn/laptop/dell.html",
    "https://cellphones.com.vn/laptop/lg.html",
    "https://cellphones.com.vn/laptop/gigabyte.html",
    "https://cellphones.com.vn/laptop/masstel.html",
    "https://cellphones.com.vn/laptop/samsung.html",
    "https://cellphones.com.vn/laptop/van-phong.html",
    "https://cellphones.com.vn/laptop/gaming.html",
    "https://cellphones.com.vn/laptop/mong-nhe.html",
]

EXCLUDE_SUBSTRINGS = [
    "/hang-cu/",
    "/phu-kien/",
    "/bo-loc/",
    "/tivi/",
    "/do-gia-dung/",
    "/nha-thong-minh/",
    "/do-choi-cong-nghe/",
    "/tra-gop",
    "/sforum",
    "/chinh-sach",
    "/quy-dinh",
    "/tuyen-dung",
    "/lien-he",
]

PHONE_URL_HINTS = [
    "iphone",
    "samsung-galaxy",
    "samsung",
    "xiaomi",
    "redmi",
    "poco",
    "oppo",
    "vivo",
    "honor",
    "realme",
    "nothing",
    "tecno",
    "motorola",
    "nubia",
    "sony",
    "xperia",
    "google",
    "pixel",
    "oneplus",
    "asus",
    "rog-phone",
    "lenovo",
    "fairphone",
    "zte",
    "infinix",
    "nokia",
    "itel",
    "blackview",
    "cat",
]

PHONE_URL_BLOCKS = [
    "tivi",
    "gaming",
    "pin-trau",
    "chup-anh-quay-phim",
    "pho-thong",
    "series",
    "watch",
    "tai-nghe",
    "loa",
    "laptop",
    "sac",
    "cu-sac",
    "micro",
    "ban-phim",
    "may-chieu",
    "dong-ho",
    "phu-kien",
    "pc",
    "man-hinh",
    "may-in",
    "dien-may",
    "do-gia-dung",
]

PHONE_EXACT_CATEGORY_PATHS = {
    "/mobile.html",
    "/mobile/apple.html",
    "/mobile/samsung.html",
    "/mobile/xiaomi.html",
    "/mobile/oppo.html",
    "/mobile/vivo.html",
    "/mobile/honor.html",
    "/mobile/tecno.html",
    "/mobile/realme.html",
    "/mobile/nothing-phone.html",
    "/mobile/nubia.html",
    "/mobile/sony.html",
    "/mobile/motorola.html",
}

LAPTOP_EXACT_CATEGORY_PATHS = {
    "/laptop.html",
    "/laptop/mac.html",
    "/laptop/asus.html",
    "/laptop/lenovo.html",
    "/laptop/msi.html",
    "/laptop/acer.html",
    "/laptop/hp.html",
    "/laptop/dell.html",
    "/laptop/lg.html",
    "/laptop/gigabyte.html",
    "/laptop/masstel.html",
    "/laptop/samsung.html",
    "/laptop/van-phong.html",
    "/laptop/gaming.html",
    "/laptop/mong-nhe.html",
}

BRAND_RULES = [
    ("Apple", ["iphone", "apple"]),
    ("Samsung", ["samsung", "galaxy"]),
    ("Xiaomi", ["xiaomi", "redmi", "poco"]),
    ("OPPO", ["oppo"]),
    ("Asus", ["asus", "rog phone", "vivobook", "zenbook", "tuf", "expertbook", "proart"]),
    ("Vivo", ["vivo"]),
    ("HONOR", ["honor"]),
    ("Realme", ["realme"]),
    ("Nothing", ["nothing"]),
    ("TECNO", ["tecno"]),
    ("Motorola", ["motorola", "moto"]),
    ("Nubia", ["nubia"]),
    ("Sony", ["sony", "xperia"]),
    ("Google", ["google", "pixel"]),
    ("OnePlus", ["oneplus"]),
    ("Lenovo", ["lenovo"]),
    ("TCL", ["tcl"]),
    ("HTC", ["htc"]),
    ("Fairphone", ["fairphone"]),
    ("ZTE", ["zte"]),
    ("Infinix", ["infinix"]),
    ("Nokia", ["nokia"]),
    ("Itel", ["itel"]),
    ("Blackview", ["blackview"]),
    ("CAT", ["cat ", "cat-"]),
]

NON_PHONE_NAME_BLOCKS = [
    "tivi",
    "tv ",
    " smart tv",
    "google tivi",
    "tủ lạnh",
    "tu lanh",
    "máy lạnh",
    "may lanh",
    "máy giặt",
    "may giat",
    "máy sấy",
    "may say",
    "máy lọc",
    "may loc",
    "air purifier",
    "purifier",
    "robot hút bụi",
    "robot hut bui",
    "máy tăm nước",
    "may tam nuoc",
    "water flosser",
    "flosser",
    "mijia",
    "legion go",
    "handheld",
    "console",
    "tablet",
    "máy tính bảng",
    "may tinh bang",
    "pad",
    "tab ",
    "vong deo tay",
    "vòng đeo tay",
    "dong ho",
    "đồng hồ",
    "watch",
    "tai nghe",
    "loa ",
    "laptop",
    "ban phim",
    "bàn phím",
    "may chieu",
    "máy chiếu",
    "pc |",
    "máy tính để bàn",
    "man hinh",
    "màn hình",
    "may in",
    "máy in",
    "dien may",
    "điện máy",
    "do gia dung",
    "đồ gia dụng",
    "phu kien",
    "phụ kiện",
    "hang cu",
    "hàng cũ",
    "series",
    "gaming",
    "pin trau",
    "pho thong",
    "phổ thông",
    "microphone",
    "sạc",
    "cu sac",
    "củ sạc",
    "cable",
    "dây cáp",
]

LAPTOP_NAME_HINTS = [
    "laptop",
    "macbook",
    "surface",
    "vivobook",
    "thinkpad",
    "ideapad",
    "zenbook",
    "yoga",
    "rog",
    "tuf",
    "nitro",
    "aspire",
    "modern",
    "prestige",
    "loq",
    "gram",
    "omnibook",
    "victus",
    "pavilion",
    "inspiron",
    "latitude",
    "probook",
    "elitebook",
    "swift",
    "gaming",
]


def is_phone_name(name: str) -> bool:
    lowered = name.lower()
    return not any(block in lowered for block in NON_PHONE_NAME_BLOCKS)


def is_laptop_name(name: str) -> bool:
    lowered = name.lower()
    return any(hint in lowered for hint in LAPTOP_NAME_HINTS)


def normalize_text(text: str | None) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def extract_section(text: str, start_label: str, end_label: str | None = None) -> str:
    lowered = text.lower()
    start_index = lowered.find(start_label.lower())
    if start_index == -1:
        return ""

    section = text[start_index + len(start_label) :]
    if end_label:
        end_index = section.lower().find(end_label.lower())
        if end_index != -1:
            section = section[:end_index]

    return normalize_text(section)


def extract_labeled_value(section: str, label: str, next_labels: list[str]) -> str:
    escaped_next = "|".join(re.escape(next_label) for next_label in next_labels)
    if escaped_next:
        pattern = re.compile(rf"{re.escape(label)}\s*(.*?)(?={escaped_next}|$)", re.IGNORECASE)
    else:
        pattern = re.compile(rf"{re.escape(label)}\s*(.*)$", re.IGNORECASE)

    match = pattern.search(section)
    if not match:
        return ""
    return normalize_text(match.group(1))


def parse_specs_text(technical_text: str) -> tuple[str | None, str | None, str | None, str | None]:
    technical_section = normalize_text(technical_text)
    if technical_section.lower().startswith("thông số kỹ thuật"):
        technical_section = technical_section[len("Thông số kỹ thuật") :].strip()
    if technical_section.lower().startswith("xem tất cả"):
        technical_section = technical_section[len("Xem tất cả") :].strip()

    field_patterns = [
        ("Kích thước màn hình", r"Kích thước màn hình\s*(.+?)(?=Công nghệ màn hình|Camera sau|Chipset|Dung lượng RAM|$)"),
        ("Công nghệ màn hình", r"Công nghệ màn hình\s*(.+?)(?=Camera sau|Camera trước|Chipset|Dung lượng RAM|$)"),
        ("Camera sau", r"Camera sau\s*(.+?)(?=Camera trước|Chipset|Dung lượng RAM|$)"),
        ("Camera trước", r"Camera trước\s*(.+?)(?=Chipset|Dung lượng RAM|Bộ nhớ trong|$)"),
        ("Chipset", r"Chipset\s*(.+?)(?=Công nghệ NFC|Dung lượng RAM|Bộ nhớ trong|Pin|$)"),
        ("Ổ cứng", r"Ổ cứng\s*(.+?)(?=Kích thước màn hình|Công nghệ màn hình|Camera sau|Camera trước|Chipset|Dung lượng RAM|Bộ nhớ trong|Pin|Hệ điều hành|Tính năng màn hình|Loại CPU|$)"),
        ("Dung lượng RAM", r"(?:Dung lượng\s+)?RAM\s*([0-9]+(?:\.[0-9]+)?\s*(?:GB|TB))"),
        ("Bộ nhớ trong", r"Bộ nhớ\s*(?:trong)?\s*([0-9]+(?:\.[0-9]+)?\s*(?:GB|TB))"),
        ("Pin", r"Pin\s*(.+?)(?=Thẻ SIM|Hệ điều hành|Tính năng màn hình|Loại CPU|$)"),
        ("Hệ điều hành", r"Hệ điều hành\s*(.+?)(?=Tính năng màn hình|Loại CPU|$)"),
        ("Tính năng màn hình", r"Tính năng màn hình\s*(.+?)(?=Loại CPU|$)"),
        ("Loại CPU", r"Loại CPU\s*(.+?)(?=$)"),
    ]

    extracted = {}
    for label, pattern in field_patterns:
        match = re.search(pattern, technical_section, re.IGNORECASE)
        if match:
            extracted[label] = normalize_text(match.group(1))

    specs_items = [f"{label}: {value}" for label, value in extracted.items() if value]

    specs_text = " | ".join(specs_items) if specs_items else None
    return (
        specs_text,
        extracted.get("Dung lượng RAM"),
        extracted.get("Bộ nhớ trong") or extracted.get("Ổ cứng"),
        extracted.get("Pin"),
    )


def extract_rating_and_count(page, body_text: str) -> tuple[float, int]:
    rating_candidates = []
    try:
        rating_candidates.append(normalize_text(page.locator('[class*="rating"]').first.text_content(timeout=3000)))
    except Exception:
        pass

    rating_candidates.append(normalize_text(body_text))

    patterns = [
        r"(?P<rating>[0-9]+(?:\.[0-9]+)?)\s*/5\s*(?P<count>[0-9]+)\s*lượt\s+đánh\s+giá",
        r"(?P<rating>[0-9]+(?:\.[0-9]+)?)\s*\((?P<count>[0-9]+)\s*(?:lượt\s+)?đánh\s+giá\)",
        r"(?P<rating>[0-9]+(?:\.[0-9]+)?)\s+(?P<count>[0-9]+)\s*đánh\s+giá",
    ]

    for candidate in rating_candidates:
        if not candidate:
            continue
        for pattern in patterns:
            match = re.search(pattern, candidate, re.IGNORECASE)
            if match:
                return float(match.group("rating")), int(match.group("count"))

    return 4.5, 0


def extract_review_snippets(page) -> list[str]:
    snippets: list[str] = []
    try:
        review_cards = page.locator('.boxReview-comment-item')
        card_count = min(review_cards.count(), 5)
        for index in range(card_count):
            card = review_cards.nth(index)
            try:
                reviewer = normalize_text(card.locator('.block-info__name .name').first.text_content(timeout=2000))
            except Exception:
                reviewer = ''

            try:
                comment = normalize_text(card.locator('.comment-content p').first.text_content(timeout=2000))
            except Exception:
                comment = ''

            try:
                star_count = card.locator('.item-review-rating__star .icon.is-active').count()
            except Exception:
                star_count = 0

            if not reviewer or not comment:
                continue

            lowered = f'{reviewer} {comment}'.lower()
            if any(fragment in lowered for fragment in ['phản hồi', 'quản trị viên', 'qtv', 'hỏi đáp']):
                continue

            rating_text = f'{star_count}⭐' if star_count else '5⭐'
            snippet = f'{reviewer} ({rating_text}): {comment}'
            if snippet not in snippets:
                snippets.append(snippet)
            if len(snippets) >= 3:
                return snippets
    except Exception:
        pass

    blocked_fragments = [
        'hỏi đáp',
        'gửi câu hỏi',
        'phản hồi',
        'lọc đánh giá theo',
        'viết đánh giá',
        'thu gọn',
        'xem thêm',
        'câu hỏi thường gặp',
        'thông tin có thể thay đổi',
        'quản trị viên',
        'qtv',
    ]

    for selector in ('[class*="comment"]', '[class*="review"]'):
        try:
            texts = page.locator(selector).all_text_contents()
        except Exception:
            continue

        for raw_text in texts:
            text = normalize_text(raw_text)
            if not text or len(text) < 20:
                continue

            lowered = text.lower()
            if any(fragment in lowered for fragment in blocked_fragments):
                continue
            if text not in snippets:
                snippets.append(text)
            if len(snippets) >= 3:
                return snippets

    return snippets


def normalize_url(url: str) -> str:
    if url.startswith("//"):
        return "https:" + url
    return urljoin(BASE_URL, url)


def is_product_url(url: str, category: str) -> bool:
    parsed = urlparse(url)
    path = parsed.path
    lowered = path.lower()

    if category == "laptop":
        exact_paths = LAPTOP_EXACT_CATEGORY_PATHS
        url_hints = ["laptop", "macbook", "surface"]
        url_blocks = [
            "tivi",
            "do-gia-dung",
            "dien-thoai",
            "mobile",
            "tablet",
            "dong-ho",
            "tai-nghe",
            "loa",
            "phu-kien",
            "may-in",
            "man-hinh",
            "pc",
        ]
    else:
        exact_paths = PHONE_EXACT_CATEGORY_PATHS
        url_hints = PHONE_URL_HINTS
        url_blocks = PHONE_URL_BLOCKS

    if not path.endswith(".html"):
        return False
    if path in exact_paths:
        return False
    if any(token in lowered for token in EXCLUDE_SUBSTRINGS):
        return False
    if any(token in lowered for token in url_blocks):
        return False
    if not any(token in lowered for token in url_hints):
        return False

    slug = path.rstrip("/").split("/")[-1]
    if len(path.strip("/").split("/")) >= 3:
        return True
    return "-" in slug and len(slug) > 6


def collect_product_urls(page, source_url: str, category: str) -> list[str]:
    page.goto(source_url, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(2500)

    for _ in range(3):
        page.evaluate("window.scrollBy(0, document.body.scrollHeight)")
        page.wait_for_timeout(1000)

    html = page.content()
    hrefs = re.findall(r'href=["\']([^"\']+\.html[^"\']*)["\']', html)

    urls = []
    seen = set()
    for href in hrefs:
        full_url = normalize_url(href.split("?")[0])
        if is_product_url(full_url, category) and full_url not in seen:
            seen.add(full_url)
            urls.append(full_url)

    return urls


def extract_first_valid_price(text: str) -> int:
    if not text:
        return 0

    candidates = re.findall(r"\d[\d\.,]*", text)
    for candidate in candidates:
        value = int(re.sub(r"\D", "", candidate))
        if 500_000 <= value <= 100_000_000:
            return value
    return 0


def infer_brand(name: str) -> str:
    lowered = name.lower()
    for brand, keywords in BRAND_RULES:
        for keyword in keywords:
            if keyword in lowered:
                return brand
    return "Other"


def normalize_image_url(url: str | None) -> str | None:
    if not url:
        return None
    if "placeholder" in url.lower():
        return None
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("/"):
        return BASE_URL + url
    return url


def extract_image(page) -> str | None:
    selectors = [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[property="twitter:image"]',
    ]

    for selector in selectors:
        try:
            node = page.locator(selector).first
            if node.count() > 0:
                image_url = normalize_image_url(node.get_attribute("content"))
                if image_url:
                    return image_url
        except Exception:
            pass

    try:
        for image_node in page.locator('img[src], img[data-src]').all()[:40]:
            source = image_node.get_attribute("src") or image_node.get_attribute("data-src")
            source = normalize_image_url(source)
            if not source:
                continue
            lowered = source.lower()
            if any(token in lowered for token in ["icon", "logo", "placeholder", "sprite"]):
                continue
            if any(token in lowered for token in ["cdn", "cellphones", "media/catalog/product"]):
                return source
    except Exception:
        pass

    return None


def extract_product_data(page, product_url: str, category: str) -> dict | None:
    page.goto(product_url, wait_until="domcontentloaded", timeout=45000)
    page.wait_for_timeout(2500)

    try:
        page.evaluate("window.scrollBy(0, 600)")
        page.wait_for_timeout(1200)
    except Exception:
        pass

    try:
        name = page.locator("h1").first.text_content(timeout=5000).strip()
    except Exception:
        name = ""

    if not name:
        title = page.title().strip()
        name = re.sub(r"\s*\|.*$", "", title).strip()

    if not name:
        return None

    image_url = extract_image(page)
    if not image_url:
        return None

    brand = infer_brand(name)
    if brand == "Other":
        return None

    if category == "phone" and not is_phone_name(name):
        return None
    if category == "laptop" and not is_laptop_name(name):
        return None

    try:
        body_text = normalize_text(page.locator("body").text_content(timeout=10000))
    except Exception:
        body_text = ""

    technical_text = ""
    try:
        technical_text = normalize_text(page.locator('[class*="technical"]').first.text_content(timeout=5000))
    except Exception:
        technical_text = ""

    specs_text, ram, rom, battery = parse_specs_text(technical_text or body_text)
    rating, review_count = extract_rating_and_count(page, body_text)
    review_snippets = extract_review_snippets(page)

    description = extract_section(body_text, "Tính năng nổi bật", "Thông số kỹ thuật")
    if not description:
        description = extract_section(body_text, "Giá sản phẩm đã bao gồm thuế VAT", "Thông số kỹ thuật")
    if description:
        description = description[:500]

    price = 0
    price_selectors = [
        '[class*="sale-price"]',
        '[class*="special-price"]',
        '[class*="product-price"]',
        '[class*="price"]',
    ]
    for selector in price_selectors:
        try:
            nodes = page.locator(selector)
            if nodes.count() > 0:
                text = nodes.first.text_content(timeout=3000) or ""
                price = extract_first_valid_price(text)
                if price:
                    break
        except Exception:
            continue

    if not price:
        try:
            body_text = page.locator("body").text_content(timeout=5000) or ""
            price = extract_first_valid_price(body_text)
        except Exception:
            price = 0

    if not price:
        return None

    reviews_text = " | ".join(review_snippets) if review_snippets else None

    return {
        "brand": brand,
        "name": name,
        "price": price,
        "image_url": image_url,
        "category": category,
        "rating": rating,
        "review_count": review_count,
        "ram": ram,
        "rom": rom,
        "battery": battery,
        "description": description or None,
        "specs": specs_text,
        "reviews": reviews_text,
    }


def ensure_database_columns(cursor: sqlite3.Cursor) -> None:
    extra_columns = [
        'ALTER TABLE phones ADD COLUMN description TEXT',
        'ALTER TABLE phones ADD COLUMN specs TEXT',
        'ALTER TABLE phones ADD COLUMN reviews TEXT',
        'ALTER TABLE phones ADD COLUMN category TEXT',
        'ALTER TABLE phones ADD COLUMN ram TEXT',
        'ALTER TABLE phones ADD COLUMN rom TEXT',
        'ALTER TABLE phones ADD COLUMN battery TEXT',
        'ALTER TABLE phones ADD COLUMN review_count INTEGER DEFAULT 0',
    ]

    for statement in extra_columns:
        try:
            cursor.execute(statement)
        except sqlite3.OperationalError:
            pass


def save_to_database(products: list[dict]) -> None:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    ensure_database_columns(cursor)

    cursor.execute("DELETE FROM phones")

    cursor.executemany(
        "INSERT INTO phones (brand, name, price, image_url, rating, description, specs, reviews, category, ram, rom, battery, review_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            (
                product["brand"],
                product["name"],
                product["price"],
                product["image_url"],
                product["rating"],
                product.get("description"),
                product.get("specs"),
                product.get("reviews"),
                product.get("category"),
                product.get("ram"),
                product.get("rom"),
                product.get("battery"),
                product.get("review_count", 0),
            )
            for product in products
        ],
    )

    conn.commit()
    conn.close()


def main() -> None:
    collected_urls: dict[str, list[str]] = {
        "phone": [],
        "laptop": [],
    }
    seen_urls: set[str] = set()

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1440, "height": 1600},
        )
        context.set_default_timeout(45000)
        page = context.new_page()

        print("[*] Collecting product URLs")
        for category_name, source_urls in (("phone", PHONE_SOURCE_URLS), ("laptop", LAPTOP_SOURCE_URLS)):
            for source_url in source_urls:
                try:
                    urls = collect_product_urls(page, source_url, category_name)
                    for url in urls:
                        if url not in seen_urls:
                            seen_urls.add(url)
                            collected_urls[category_name].append(url)
                    print(f"    [{category_name}] {source_url} -> {len(urls)} candidates")
                except Exception as exc:
                    print(f"    [{category_name}] {source_url} -> error: {str(exc)[:80]}")

        print(
            f"[*] Collected {len(collected_urls['phone'])} phone URLs and {len(collected_urls['laptop'])} laptop URLs"
        )

        products: list[dict] = []
        for category_name, target_count in (("phone", PHONE_TARGET_COUNT), ("laptop", LAPTOP_TARGET_COUNT)):
            for index, product_url in enumerate(collected_urls[category_name], 1):
                if len([product for product in products if product.get('category') == category_name]) >= target_count:
                    break

                print(f"[{category_name} {index}] {product_url}", end="")
                try:
                    product = extract_product_data(page, product_url, category_name)
                    if not product:
                        print(" -> skip")
                        continue

                    product["category"] = category_name
                    products.append(product)
                    print(f" -> ok: {product['name'][:45]}")
                except Exception as exc:
                    print(f" -> error: {str(exc)[:80]}")

                time.sleep(1.2)

        browser.close()

    if len(products) < TARGET_COUNT:
        print(f"[WARN] Only scraped {len(products)} products, still saving what we have.")

    save_to_database(products)

    print(f"\n{'=' * 60}")
    print(f"[DONE] Saved {len(products)} products into phones.db")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()