import logging
import re
import secrets
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from email.header import Header
from email.mime.text import MIMEText

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import (
    GOOGLE_CLIENT_ID,
    FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET,
    OTP_EMAIL_EXPIRE_MINUTES,
    OTP_EMAIL_FROM,
    OTP_EMAIL_PASSWORD,
    OTP_EMAIL_PORT,
    OTP_EMAIL_SMTP_HOST,
    OTP_EMAIL_USERNAME,
)
from app.db.session import get_db
from app.models import User
from app.schemas import (
    UserGoogleLogin,
    UserFacebookLogin,
    UserLogin,
    UserRegisterEmailOtpRequest,
    UserRegisterEmailOtpVerify,
    UserRegistration,
)

router = APIRouter(prefix="/api/users")
logger = logging.getLogger("uvicorn.error")

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_REGEX = re.compile(r"^0\d{9,10}$")
PHONE_EMAIL_DOMAIN = "phone.smartmobile.local"
OTP_RESEND_COOLDOWN_SECONDS = 30
OTP_MAX_VERIFY_ATTEMPTS = 5
EMAIL_OTP_STORE: dict[str, dict] = {}


def _clean_text(value: str) -> str:
    return (value or "").strip()


def _normalize_email(email: str) -> str:
    return _clean_text(email).lower()


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", _clean_text(phone))
    if digits.startswith("84"):
        digits = f"0{digits[2:]}"
    return digits


def _is_valid_email(email: str) -> bool:
    return bool(EMAIL_REGEX.match(email))


def _is_valid_phone(phone: str) -> bool:
    return bool(PHONE_REGEX.match(phone))


def _is_virtual_email(email: str) -> bool:
    return _normalize_email(email).endswith(f"@{PHONE_EMAIL_DOMAIN}")


def _build_virtual_email_from_phone(phone: str) -> str:
    return f"phone-{phone}@{PHONE_EMAIL_DOMAIN}"


def _build_otp_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def _send_otp_email_sync(email: str, name: str, otp: str) -> None:
    missing_keys = []
    if not OTP_EMAIL_SMTP_HOST:
        missing_keys.append("OTP_EMAIL_SMTP_HOST")
    if not OTP_EMAIL_USERNAME:
        missing_keys.append("OTP_EMAIL_USERNAME")
    if not OTP_EMAIL_PASSWORD:
        missing_keys.append("OTP_EMAIL_PASSWORD")

    if missing_keys:
        raise RuntimeError(f"OTP Gmail is not configured. Missing: {', '.join(missing_keys)}")

    message = MIMEText(
        (
            f"Xin chào {name},\n\n"
            f"Mã OTP đăng ký SmartMobile của bạn là: {otp}\n"
            f"Mã có hiệu lực trong {OTP_EMAIL_EXPIRE_MINUTES} phút.\n\n"
            "Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này."
        ),
        "plain",
        "utf-8",
    )
    message["Subject"] = str(Header("[SmartMobile] Mã OTP đăng ký tài khoản", "utf-8"))
    message["From"] = OTP_EMAIL_FROM
    message["To"] = email

    with smtplib.SMTP(OTP_EMAIL_SMTP_HOST, OTP_EMAIL_PORT, timeout=15) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        smtp.login(OTP_EMAIL_USERNAME, OTP_EMAIL_PASSWORD)
        smtp.sendmail(OTP_EMAIL_FROM, [email], message.as_string())


def serialize_user(user: User) -> dict:
    email = user.email or ""
    is_virtual_email = _is_virtual_email(email)
    return {
        "id": user.user_id,
        "name": user.name,
        "email": email,
        "display_email": "" if is_virtual_email else email,
        "is_virtual_email": is_virtual_email,
        "role": user.role,
        "phone": user.phone or "",
        "status": user.status or "active",
        "created_at": user.created_at,
    }


async def _find_user_by_phone(phone: str, db: AsyncSession) -> User | None:
    if not phone:
        return None

    result = await db.execute(select(User).filter(User.phone.is_not(None)))
    users = result.scalars().all()
    for user in users:
        if _normalize_phone(user.phone or "") == phone:
            return user
    return None


async def _find_user_by_email(email: str, db: AsyncSession) -> User | None:
    result = await db.execute(select(User).filter(func.lower(User.email) == email))
    return result.scalars().first()


def _validate_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Mật khẩu phải có tối thiểu 8 ký tự")


def _validate_name(name: str) -> None:
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Họ tên không hợp lệ")


def _save_otp_record(email: str, name: str, password: str, phone: str) -> str:
    now = datetime.now(timezone.utc)
    previous = EMAIL_OTP_STORE.get(email)
    if previous and previous["expires_at"] > now:
        if (now - previous["sent_at"]).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS:
            raise HTTPException(status_code=429, detail="Vui lòng chờ 30 giây trước khi gửi lại OTP")

    otp = _build_otp_code()
    EMAIL_OTP_STORE[email] = {
        "name": name,
        "password": password,
        "phone": phone,
        "otp": otp,
        "sent_at": now,
        "expires_at": now + timedelta(minutes=OTP_EMAIL_EXPIRE_MINUTES),
        "attempts": 0,
    }
    return otp


async def _verify_google_id_token(id_token: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": id_token},
            )
    except Exception as error:
        logger.exception("google_token_verify_failed err=%s", str(error))
        raise HTTPException(status_code=502, detail="Không thể xác thực Google token lúc này")

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Google token không hợp lệ")

    payload = response.json()
    email = _normalize_email(payload.get("email"))
    aud = _clean_text(payload.get("aud"))
    email_verified = str(payload.get("email_verified", "")).lower() in {"true", "1"}

    if not email or not email_verified:
        raise HTTPException(status_code=401, detail="Tài khoản Google chưa xác thực email")

    if GOOGLE_CLIENT_ID and aud != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Google token không đúng ứng dụng")

    return payload


async def _verify_facebook_access_token(access_token: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.get(
                "https://graph.facebook.com/me",
                params={
                    "access_token": access_token,
                    "fields": "id,name,email,picture.type(large)",
                },
            )
    except Exception as error:
        logger.exception("facebook_token_verify_failed err=%s", str(error))
        raise HTTPException(status_code=502, detail="Không thể xác thực Facebook token lúc này")

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Facebook token không hợp lệ")

    payload = response.json()
    email = _normalize_email(payload.get("email"))
    
    if not email:
        raise HTTPException(status_code=401, detail="Tài khoản Facebook chưa được xác thực email")

    return payload


@router.post("/register/request-otp")
async def request_register_otp(payload: UserRegisterEmailOtpRequest, db: AsyncSession = Depends(get_db)):
    name = _clean_text(payload.name)
    email = _normalize_email(payload.email)
    password = _clean_text(payload.password)
    phone = _normalize_phone(payload.phone)

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="Vui lòng nhập đầy đủ họ tên, email và mật khẩu")

    _validate_name(name)
    _validate_password(password)

    if not _is_valid_email(email):
        raise HTTPException(status_code=400, detail="Email không hợp lệ")

    if phone and not _is_valid_phone(phone):
        raise HTTPException(status_code=400, detail="Số điện thoại không hợp lệ")

    existing_email = await _find_user_by_email(email, db)
    if existing_email:
        raise HTTPException(status_code=409, detail="Email này đã được sử dụng")

    if phone:
        existing_phone = await _find_user_by_phone(phone, db)
        if existing_phone:
            raise HTTPException(status_code=409, detail="Số điện thoại này đã được sử dụng")

    otp = _save_otp_record(email, name, password, phone)

    try:
        _send_otp_email_sync(email, name, otp)
    except Exception as error:
        EMAIL_OTP_STORE.pop(email, None)
        logger.exception("otp_email_send_failed email=%s err=%s", email, str(error))
        raise HTTPException(
            status_code=500,
            detail=f"Không thể gửi OTP qua Gmail. Chi tiết: {str(error)}",
        )

    return {
        "success": True,
        "message": f"Đã gửi OTP tới {email}. Mã có hiệu lực trong {OTP_EMAIL_EXPIRE_MINUTES} phút.",
    }


@router.post("/register/verify-otp")
async def verify_register_otp(payload: UserRegisterEmailOtpVerify, db: AsyncSession = Depends(get_db)):
    email = _normalize_email(payload.email)
    otp = _clean_text(payload.otp)

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Thiếu email hoặc OTP")

    record = EMAIL_OTP_STORE.get(email)
    if not record:
        raise HTTPException(status_code=400, detail="OTP không tồn tại hoặc đã hết hạn")

    now = datetime.now(timezone.utc)
    if record["expires_at"] <= now:
        EMAIL_OTP_STORE.pop(email, None)
        raise HTTPException(status_code=400, detail="OTP đã hết hạn")

    if record["otp"] != otp:
        record["attempts"] += 1
        if record["attempts"] >= OTP_MAX_VERIFY_ATTEMPTS:
            EMAIL_OTP_STORE.pop(email, None)
            raise HTTPException(status_code=400, detail="OTP sai quá nhiều lần. Vui lòng yêu cầu mã mới")
        raise HTTPException(status_code=400, detail="OTP không chính xác")

    existing_email = await _find_user_by_email(email, db)
    if existing_email:
        EMAIL_OTP_STORE.pop(email, None)
        raise HTTPException(status_code=409, detail="Email này đã được sử dụng")

    phone = record["phone"]
    if phone:
        existing_phone = await _find_user_by_phone(phone, db)
        if existing_phone:
            EMAIL_OTP_STORE.pop(email, None)
            raise HTTPException(status_code=409, detail="Số điện thoại này đã được sử dụng")

    new_user = User(
        user_id=str(uuid.uuid4()),
        name=record["name"],
        email=email,
        password=record["password"],
        role="customer",
        phone=phone,
        status="active",
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    EMAIL_OTP_STORE.pop(email, None)

    logger.info("register_email_otp_success email=%s role=%s", new_user.email, new_user.role)
    return {"success": True, "data": serialize_user(new_user)}

@router.post("/register")
async def register_user(payload: UserRegistration, db: AsyncSession = Depends(get_db)):
    name = _clean_text(payload.name)
    register_method = _clean_text(payload.registerMethod).lower() or "phone"
    email = _normalize_email(payload.email)
    phone = _normalize_phone(payload.phone)
    password = _clean_text(payload.password)

    if register_method not in {"phone", "email"}:
        raise HTTPException(status_code=400, detail="Phương thức đăng ký không hợp lệ")

    if not name or not password:
        raise HTTPException(status_code=400, detail="Missing required user data")

    _validate_name(name)
    _validate_password(password)

    if register_method == "email":
        raise HTTPException(
            status_code=400,
            detail="Đăng ký bằng email yêu cầu OTP. Vui lòng dùng endpoint /api/users/register/request-otp",
        )

    if not phone or not _is_valid_phone(phone):
        raise HTTPException(status_code=400, detail="Số điện thoại không hợp lệ")

    existing_phone = await _find_user_by_phone(phone, db)
    if existing_phone:
        raise HTTPException(status_code=409, detail="Số điện thoại này đã được sử dụng")

    resolved_email = _build_virtual_email_from_phone(phone)
    existing_email = await _find_user_by_email(resolved_email, db)
    if existing_email:
        raise HTTPException(status_code=409, detail="Tài khoản theo số điện thoại đã tồn tại")

    new_user = User(
        user_id=str(uuid.uuid4()),
        name=name,
        email=resolved_email,
        password=password,
        role="customer",
        phone=phone,
        status="active",
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info("register_phone_success phone=%s role=%s", new_user.phone, new_user.role)
    return {"success": True, "data": serialize_user(new_user)}


@router.post("/login")
async def login_user(payload: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    identifier = _clean_text(payload.identifier or payload.email or payload.phone)
    password = _clean_text(payload.password)
    normalized_phone = _normalize_phone(identifier)
    normalized_email = _normalize_email(identifier)

    if not identifier or not password:
        raise HTTPException(status_code=400, detail="Email/số điện thoại và mật khẩu là bắt buộc")

    user = None
    if _is_valid_email(normalized_email):
        user = await _find_user_by_email(normalized_email, db)

    if not user and normalized_phone:
        user = await _find_user_by_phone(normalized_phone, db)

    if not user or (user.password or "") != password:
        logger.warning("login_failed identifier=%s ip=%s", identifier, request.client.host if request.client else "unknown")
        raise HTTPException(status_code=401, detail="Email/số điện thoại hoặc mật khẩu không đúng")

    if (user.status or "active").lower() != "active":
        logger.warning("login_blocked email=%s status=%s ip=%s", user.email, user.status, request.client.host if request.client else "unknown")
        raise HTTPException(status_code=403, detail="Tài khoản đang bị khóa")

    logger.info("login_success email=%s role=%s ip=%s", user.email, user.role, request.client.host if request.client else "unknown")
    return {"success": True, "data": serialize_user(user)}


@router.post("/google-login")
async def google_login(payload: UserGoogleLogin, request: Request, db: AsyncSession = Depends(get_db)):
    id_token = _clean_text(payload.idToken)
    if not id_token:
        raise HTTPException(status_code=400, detail="Google token là bắt buộc")

    token_data = await _verify_google_id_token(id_token)
    email = _normalize_email(token_data.get("email"))
    display_name = _clean_text(token_data.get("name")) or email.split("@")[0]

    user = await _find_user_by_email(email, db)
    created_new_user = False

    if user:
        if (user.status or "active").lower() != "active":
            logger.warning("google_login_blocked email=%s status=%s ip=%s", user.email, user.status, request.client.host if request.client else "unknown")
            raise HTTPException(status_code=403, detail="Tài khoản đang bị khóa")

        if not _clean_text(user.name):
            user.name = display_name
            await db.commit()
            await db.refresh(user)
    else:
        user = User(
            user_id=str(uuid.uuid4()),
            name=display_name,
            email=email,
            password=None,
            role="customer",
            phone="",
            status="active",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        created_new_user = True

    logger.info(
        "google_login_success email=%s created=%s ip=%s",
        user.email,
        created_new_user,
        request.client.host if request.client else "unknown",
    )
    return {"success": True, "data": serialize_user(user)}


@router.post("/facebook-login")
async def facebook_login(payload: UserFacebookLogin, request: Request, db: AsyncSession = Depends(get_db)):
    access_token = _clean_text(payload.accessToken)
    if not access_token:
        raise HTTPException(status_code=400, detail="Facebook token là bắt buộc")

    token_data = await _verify_facebook_access_token(access_token)
    email = _normalize_email(token_data.get("email"))
    display_name = _clean_text(token_data.get("name")) or email.split("@")[0]

    user = await _find_user_by_email(email, db)
    created_new_user = False

    if user:
        if (user.status or "active").lower() != "active":
            logger.warning("facebook_login_blocked email=%s status=%s ip=%s", user.email, user.status, request.client.host if request.client else "unknown")
            raise HTTPException(status_code=403, detail="Tài khoản đang bị khóa")

        if not _clean_text(user.name):
            user.name = display_name
            await db.commit()
            await db.refresh(user)
    else:
        user = User(
            user_id=str(uuid.uuid4()),
            name=display_name,
            email=email,
            password=None,
            role="customer",
            phone="",
            status="active",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        created_new_user = True

    logger.info(
        "facebook_login_success email=%s created=%s ip=%s",
        user.email,
        created_new_user,
        request.client.host if request.client else "unknown",
    )
    return {"success": True, "data": serialize_user(user)}

