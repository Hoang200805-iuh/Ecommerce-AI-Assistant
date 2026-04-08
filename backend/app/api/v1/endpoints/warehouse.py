from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from typing import Optional
from app.db.session import get_db
from app.models import Phone, Order, OrderItem, Payment, Spec
from app.schemas import InventoryUpdate, OrderStatusUpdate, WarehouseProductCreate

router = APIRouter(prefix="/api/warehouse")

def format_inventory_item(phone):
    stock = phone.stock if phone.stock is not None else 0
    min_stock = phone.min_stock if phone.min_stock is not None else 10
    min_stock = max(0, min_stock)
    
    if stock == 0:
        status = 'out_stock'
    elif stock <= min_stock:
        status = 'low_stock'
    else:
        status = 'in_stock'
        
    return {
        "id": phone.id,
        "name": phone.name,
        "brand": phone.brand,
        "sku": getattr(phone, "sku", None) or f"SKU-{str(phone.id).zfill(4)}",
        "stock": stock,
        "minStock": min_stock,
        "price": phone.price or 0,
        "status": status
    }

@router.post("/products")
async def create_warehouse_product(payload: WarehouseProductCreate, db: AsyncSession = Depends(get_db)):
    name = payload.name.strip() if payload.name else ""
    brand = payload.brand.strip() if payload.brand else ""

    if not name or not brand:
        raise HTTPException(status_code=400, detail="Tên sản phẩm và thương hiệu là bắt buộc")

    if payload.price is None or payload.price < 0:
        raise HTTPException(status_code=400, detail="Giá sản phẩm không hợp lệ")

    duplicate_query = select(Phone).filter(
        func.lower(Phone.name) == name.lower(),
        func.lower(Phone.brand) == brand.lower()
    )
    duplicate_result = await db.execute(duplicate_query)
    duplicate = duplicate_result.scalars().first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Sản phẩm này đã tồn tại trong kho")

    stock = max(0, payload.stock or 0)
    min_stock = max(0, payload.minStock or 10)
    rating = payload.rating if payload.rating is not None else 0
    review_count = max(0, payload.reviewCount or 0)

    phone = Phone(
        name=name,
        brand=brand,
        price=float(payload.price),
        rating=max(0, min(5, float(rating))),
        review_count=review_count,
        description=payload.description.strip() if payload.description else None,
        image_url=payload.imageUrl.strip() if payload.imageUrl else None,
        stock=stock,
        min_stock=min_stock,
        ram=payload.ram.strip() if payload.ram else None,
        rom=payload.rom.strip() if payload.rom else None,
        battery=payload.battery.strip() if payload.battery else None,
        category=payload.category.strip() if payload.category else None,
    )
    db.add(phone)
    await db.flush()

    cleaned_specs = []
    for key, value in (payload.specs or {}).items():
        clean_key = str(key).strip()
        clean_value = str(value).strip()
        if not clean_key or not clean_value:
            continue
        cleaned_specs.append((clean_key, clean_value))

    if cleaned_specs:
        db.add_all([
            Spec(phone_id=phone.id, spec_key=spec_key, spec_value=spec_value)
            for spec_key, spec_value in cleaned_specs
        ])
        phone.specs = " | ".join([f"{spec_key}: {spec_value}" for spec_key, spec_value in cleaned_specs])

    await db.commit()
    await db.refresh(phone)

    return {"success": True, "data": format_inventory_item(phone)}

@router.get("/inventory")
async def get_inventory(
    search: Optional[str] = "",
    brand: Optional[str] = "",
    db: AsyncSession = Depends(get_db)
):
    query = select(Phone)
    
    if search:
        query = query.filter(
            Phone.name.like(f"%{search}%") | 
            Phone.brand.like(f"%{search}%") | 
            Phone.id.cast(func.text()).like(f"%{search}%")
        )
    if brand:
        query = query.filter(Phone.brand == brand)
        
    query = query.order_by(Phone.brand.asc(), Phone.name.asc())
    
    result = await db.execute(query)
    phones = result.scalars().all()
    
    inventory = [format_inventory_item(p) for p in phones]
    
    summary = {
        "totalProducts": len(inventory),
        "totalStock": sum(i["stock"] for i in inventory),
        "inStock": sum(1 for i in inventory if i["status"] == "in_stock"),
        "lowStock": sum(1 for i in inventory if i["status"] == "low_stock"),
        "outStock": sum(1 for i in inventory if i["status"] == "out_stock"),
    }
    
    return {"success": True, "data": inventory, "summary": summary}

@router.patch("/inventory/{id}")
async def update_inventory(id: int, payload: InventoryUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Phone).filter(Phone.id == id))
    phone = result.scalars().first()
    
    if not phone:
        raise HTTPException(status_code=404, detail="Product not found")
        
    next_stock = phone.stock if phone.stock is not None else 0
    if payload.stock is not None:
        next_stock = max(0, payload.stock)
        
    next_min_stock = phone.min_stock if phone.min_stock is not None else 10
    if payload.minStock is not None:
        next_min_stock = max(0, payload.minStock)
        
    phone.stock = next_stock
    phone.min_stock = next_min_stock
    await db.commit()
    await db.refresh(phone)
    
    return {"success": True, "data": format_inventory_item(phone)}

@router.get("/orders")
async def get_warehouse_orders(status: Optional[str] = "", db: AsyncSession = Depends(get_db)):
    # count summary
    summary_query = select(
        func.count().label("totalOrders"),
        func.sum(case((Order.status == 'pending', 1), else_=0)).label("pending"),
        func.sum(case((Order.status == 'processing', 1), else_=0)).label("processing"),
        func.sum(case((Order.status == 'shipped', 1), else_=0)).label("shipped"),
        func.sum(case((Order.status == 'delivered', 1), else_=0)).label("delivered"),
        func.sum(case((Order.status == 'cancelled', 1), else_=0)).label("cancelled")
    )
    summary_res = await db.execute(summary_query)
    summary_row = summary_res.first()
    
    query = select(Order).order_by(Order.created_at.desc())
    if status and status != 'Tất cả':
        query = query.filter(Order.status == status)
        
    result = await db.execute(query)
    orders = result.scalars().all()
    
    orders_with_items = []
    for order in orders:
        i_res = await db.execute(select(OrderItem).filter(OrderItem.order_id == order.order_id).order_by(OrderItem.product_name.asc()))
        items = i_res.scalars().all()
        
        order_dict = {
            "order_id": order.order_id,
            "customer": order.user_name,
            "email": order.user_email,
            "shipping_name": order.shipping_name,
            "shipping_email": order.shipping_email,
            "phone": order.shipping_phone,
            "address": order.shipping_address,
            "city": order.shipping_city,
            "note": order.note,
            "payment": order.payment_method,
            "status": order.status,
            "total": order.total_price,
            "date": order.created_at,
            "items": [
                {
                    "order_item_id": i.order_item_id,
                    "product_id": i.product_id,
                    "product_name": i.product_name,
                    "brand": i.brand,
                    "quantity": i.quantity,
                    "price": i.price,
                    "image_url": i.image_url
                } for i in items
            ]
        }
        orders_with_items.append(order_dict)
        
    return {
        "success": True,
        "data": {
            "summary": {
                "totalOrders": summary_row.totalOrders or 0,
                "pending": summary_row.pending or 0,
                "processing": summary_row.processing or 0,
                "shipped": summary_row.shipped or 0,
                "delivered": summary_row.delivered or 0,
                "cancelled": summary_row.cancelled or 0,
            },
            "orders": orders_with_items
        }
    }

@router.patch("/orders/{id}/status")
async def update_order_status(id: str, payload: OrderStatusUpdate, db: AsyncSession = Depends(get_db)):
    allowed_statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
    next_status = payload.status
    comment = (payload.comment or "").strip()
    if not next_status or next_status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid order status update")
    if next_status == 'cancelled' and not comment:
        raise HTTPException(status_code=400, detail="Vui lòng nhập bình luận khi huỷ đơn")
        
    result = await db.execute(select(Order).filter(Order.order_id == id))
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.status == 'delivered' and next_status != 'delivered':
        raise HTTPException(status_code=400, detail="Delivered orders cannot be changed")
    if order.status == 'cancelled' and next_status != 'cancelled':
        raise HTTPException(status_code=400, detail="Cancelled orders cannot be reopened")
    if next_status == 'cancelled' and order.status in ['shipped', 'delivered']:
        raise HTTPException(status_code=400, detail="Shipped or delivered orders cannot be cancelled")
        
    should_restock = next_status == 'cancelled' and order.status in ['pending', 'processing']
    
    if should_restock:
        i_res = await db.execute(select(OrderItem).filter(OrderItem.order_id == id))
        items = i_res.scalars().all()
        for item in items:
            p_res = await db.execute(select(Phone).filter(Phone.id == item.product_id))
            phone = p_res.scalars().first()
            if phone:
                phone.stock = (phone.stock or 0) + item.quantity

    if next_status == 'cancelled':
        cancel_note = f"[Kho huỷ] {comment}"
        current_note = (order.note or '').strip()
        if current_note:
            order.note = f"{current_note}\n{cancel_note}" if cancel_note not in current_note else current_note
        else:
            order.note = cancel_note
                
    order.status = next_status
    
    pay_res = await db.execute(select(Payment).filter(Payment.order_id == id))
    payment = pay_res.scalars().first()
    if payment:
        payment.payment_status = 'completed' if next_status == 'delivered' else 'cancelled' if next_status == 'cancelled' else 'pending'
        
    await db.commit()
    await db.refresh(order)
    
    # Reload items to return
    i_res2 = await db.execute(select(OrderItem).filter(OrderItem.order_id == id).order_by(OrderItem.product_name.asc()))
    items_refreshed = i_res2.scalars().all()
    
    order_dict = {
        "order_id": order.order_id,
        "customer": order.user_name,
        "email": order.user_email,
        "shipping_name": order.shipping_name,
        "shipping_email": order.shipping_email,
        "phone": order.shipping_phone,
        "address": order.shipping_address,
        "city": order.shipping_city,
        "note": order.note,
        "payment": order.payment_method,
        "status": order.status,
        "total": order.total_price,
        "date": order.created_at,
        "items": [
            {
                "order_item_id": i.order_item_id,
                "product_id": i.product_id,
                "product_name": i.product_name,
                "brand": i.brand,
                "quantity": i.quantity,
                "price": i.price,
                "image_url": i.image_url
            } for i in items_refreshed
        ]
    }
    
    return {"success": True, "data": order_dict}
