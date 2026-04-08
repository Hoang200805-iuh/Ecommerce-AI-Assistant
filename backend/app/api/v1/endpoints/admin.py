from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
import uuid
from app.db.session import get_db
from app.models import User, Order, OrderItem, Phone
from app.schemas import AdminUserCreate, AdminUserUpdate

router = APIRouter(prefix="/api/admin")

@router.get("/users")
async def get_all_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc(), User.name.asc()))
    users = result.scalars().all()
    
    user_list = []
    for user in users:
        o_res = await db.execute(select(func.count()).filter(func.lower(Order.user_email) == func.lower(user.email)))
        order_count = o_res.scalar() or 0
        
        user_list.append({
            "id": user.user_id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "phone": user.phone or "",
            "status": user.status or "active",
            "created_at": user.created_at,
            "orders": order_count
        })
        
    return {"success": True, "data": user_list}

@router.post("/users")
async def create_user(payload: AdminUserCreate, db: AsyncSession = Depends(get_db)):
    name = payload.name.strip()
    email = payload.email.strip().lower()
    
    if not name or not email:
        raise HTTPException(status_code=400, detail="Missing required user data")
        
    result = await db.execute(select(User).filter(func.lower(User.email) == email))
    existing = result.scalars().first()
    
    if existing:
        raise HTTPException(status_code=409, detail="Email này đã được sử dụng")
        
    user_id = str(uuid.uuid4())
    new_user = User(
        user_id=user_id,
        name=name,
        email=email,
        password=payload.password,
        role=payload.role.strip() if payload.role else "customer",
        phone=payload.phone.strip() if payload.phone else "",
        status=payload.status.strip() if payload.status else "active"
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

@router.put("/users/{id}")
async def update_user(id: str, payload: AdminUserUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.user_id == id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    email = payload.email.strip().lower() if payload.email is not None else user.email.lower()
    
    dup_res = await db.execute(select(User).filter(func.lower(User.email) == email, User.user_id != id))
    duplicate = dup_res.scalars().first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Email này đã được sử dụng")
        
    if payload.name is not None:
        user.name = payload.name.strip()
    if payload.email is not None:
        user.email = payload.email.strip()
    if payload.role is not None:
        user.role = payload.role.strip()
    if payload.phone is not None:
        user.phone = payload.phone.strip()
    if payload.status is not None:
        user.status = payload.status.strip()
    if getattr(payload, 'password', None) is not None:
        user.password = payload.password
        
    await db.commit()
    await db.refresh(user)
    
    user_dict = {
        "id": user.user_id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone or "",
        "status": user.status or "active",
        "created_at": user.created_at
    }
    
    return {"success": True, "data": user_dict}

@router.delete("/users/{id}")
async def delete_user(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.user_id == id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    await db.delete(user)
    await db.commit()
    
    return {"success": True}

@router.get("/reports")
async def get_reports(db: AsyncSession = Depends(get_db)):
    # totalOrders, totalRevenue
    summary_query = select(
        func.count().label("totalOrders"),
        func.coalesce(func.sum(Order.total_price), 0).label("totalRevenue")
    )
    summary_res = await db.execute(summary_query)
    summary_row = summary_res.first()
    
    # totalUsers
    tu_res = await db.execute(select(func.count(User.user_id)))
    total_users = tu_res.scalar() or 0
    
    # monthOrders, monthRevenue (Current Month)
    from datetime import datetime
    current_month = datetime.now().strftime("%Y-%m")
    month_sum_query = select(
        func.count().label("monthOrders"),
        func.coalesce(func.sum(Order.total_price), 0).label("monthRevenue")
    ).filter(func.strftime("%Y-%m", Order.created_at) == current_month)
    month_sum_res = await db.execute(month_sum_query)
    month_summary = month_sum_res.first()
    
    # totalStock
    ts_res = await db.execute(select(func.coalesce(func.sum(Phone.stock), 0)))
    total_stock = ts_res.scalar() or 0
    
    # recentOrders
    ro_res = await db.execute(select(Order).order_by(Order.created_at.desc()).limit(10))
    recent_orders_rows = ro_res.scalars().all()
    recent_orders = []
    for ro in recent_orders_rows:
        io_res = await db.execute(select(OrderItem.product_name).filter(OrderItem.order_id == ro.order_id))
        products = [i for i in io_res.scalars().all()]
        recent_orders.append({
            "order_id": ro.order_id,
            "customer": ro.user_name,
            "email": ro.user_email,
            "status": ro.status,
            "amount": ro.total_price,
            "payment": ro.payment_method,
            "date": ro.created_at,
            "products": ", ".join(products)
        })
        
    # topProducts
    tp_query = select(
        OrderItem.product_name.label("name"),
        func.sum(OrderItem.quantity).label("sold"),
        func.sum(OrderItem.quantity * OrderItem.price).label("revenue")
    ).group_by(OrderItem.product_id, OrderItem.product_name).order_by(desc("sold"), desc("revenue")).limit(5)
    tp_res = await db.execute(tp_query)
    
    top_revenue = []
    for index, tp in enumerate(tp_res.all()):
        top_revenue.append({
            "name": tp.name,
            "sold": tp.sold or 0,
            "revenue": tp.revenue or 0,
            "pct": max(20, 95 - index * 13)
        })
        
    # monthlyData
    # Note: SQLite datetime functions can be tricky, doing it simply:
    md_query = select(
        func.strftime("%m", Order.created_at).label("month"),
        func.coalesce(func.sum(Order.total_price), 0).label("revenue"),
        func.count().label("orders")
    ).filter(Order.created_at >= func.datetime('now', '-6 months')).group_by(func.strftime("%Y-%m", Order.created_at)).order_by(func.strftime("%Y-%m", Order.created_at).asc())
    
    md_res = await db.execute(md_query)
    monthly_raw = md_res.all()
    
    month_labels = ['T8', 'T9', 'T10', 'T11', 'T12', 'T1', 'T2', 'T3']
    monthly_data = []
    for index, row in enumerate(monthly_raw[-8:]):
        monthly_data.append({
            "month": month_labels[index] if index < len(month_labels) else f"T{index+1}",
            "revenue": float(row.revenue or 0) / 1000000000,
            "orders": row.orders or 0
        })
        
    return {
        "success": True,
        "data": {
            "summary": {
                "totalOrders": summary_row.totalOrders or 0,
                "totalRevenue": summary_row.totalRevenue or 0,
                "totalUsers": total_users,
                "totalStock": total_stock,
                "monthOrders": month_summary.monthOrders if month_summary else 0,
                "monthRevenue": month_summary.monthRevenue if month_summary else 0,
            },
            "recentOrders": recent_orders,
            "topProducts": top_revenue,
            "monthlyData": monthly_data
        }
    }
