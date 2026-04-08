from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.db.session import get_db
from app.models import User
from app.schemas import UserRegistration

router = APIRouter(prefix="/api/users")

@router.post("/register")
async def register_user(payload: UserRegistration, db: AsyncSession = Depends(get_db)):
    name = payload.name.strip()
    email = payload.email.strip().lower()
    phone = (payload.phone or "").strip()
    
    if not name or not email:
        raise HTTPException(status_code=400, detail="Missing required user data")
        
    result = await db.execute(select(User).filter(User.email == email))
    existing = result.scalars().first()
    
    if existing:
        raise HTTPException(status_code=409, detail="Email này đã được sử dụng")
        
    user_id = str(uuid.uuid4())
    new_user = User(
        user_id=user_id,
        name=name,
        email=email,
        password=payload.password,
        role="customer",
        phone=phone,
        status="active"
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    user_dict = {
        "id": new_user.user_id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role,
        "phone": new_user.phone or "",
        "status": new_user.status or "active",
        "created_at": new_user.created_at
    }
    
    return {"success": True, "data": user_dict}
