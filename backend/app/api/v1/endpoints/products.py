from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.db.session import get_db
from app.models import Phone, Spec

router = APIRouter(prefix="/api")

@router.get("/products")
async def get_products(
    search: Optional[str] = None,
    brand: Optional[str] = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    query = select(Phone)
    
    if search:
        query = query.filter(Phone.name.like(f"%{search}%"))
    if brand:
        query = query.filter(Phone.brand == brand)
        
    query = query.limit(min(limit, 100))
    result = await db.execute(query)
    phones = result.scalars().all()
    
    if not phones:
        return {"success": True, "data": []}
        
    phones_with_specs = []
    for phone in phones:
        phone_dict = {
            c.name: getattr(phone, c.name) for c in phone.__table__.columns
        }
        
        # Fetch specs from specs table
        spec_query = select(Spec).filter(Spec.phone_id == phone.id)
        spec_result = await db.execute(spec_query)
        specs = spec_result.scalars().all()
        
        specs_obj = {s.spec_key: s.spec_value for s in specs}
        phone_dict["specs"] = specs_obj
        phones_with_specs.append(phone_dict)
        
    return {"success": True, "data": phones_with_specs}

@router.get("/products/{id}")
async def get_product_by_id(id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Phone).filter(Phone.id == id))
    phone = result.scalars().first()
    
    if not phone:
        return {"message": "Phone not found"}, 404
        
    phone_dict = {
        c.name: getattr(phone, c.name) for c in phone.__table__.columns
    }
    
    specs_obj = {}
    reviews_list = []
    
    # In server.js they attempt to parse phone.specs which was text
    if phone.specs and phone.specs != "N/A":
        try:
            for spec in phone.specs.split(" | "):
                if ": " in spec:
                    k, v = spec.split(": ", 1)
                    specs_obj[k.strip()] = v.strip() or "N/A"
        except:
            pass
            
    if phone.reviews and phone.reviews != "N/A":
        try:
            for rev in phone.reviews.split(" | "):
                if rev.strip():
                    reviews_list.append(rev.strip())
        except:
            pass
            
    phone_dict["specs"] = specs_obj
    phone_dict["reviews"] = reviews_list
    
    return {"success": True, "data": phone_dict}

@router.get("/phones")
async def get_phones(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Phone))
    phones = result.scalars().all()
    return {"success": True, "data": phones}

@router.get("/brands")
async def get_brands(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Phone.brand).distinct())
    brands = result.scalars().all()
    return {"success": True, "data": brands}
