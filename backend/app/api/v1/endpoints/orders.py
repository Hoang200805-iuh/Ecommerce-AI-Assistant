from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import re
import uuid
from app.db.session import get_db
from app.models import Phone, Order, OrderItem, Payment, User
from app.schemas import OrderCreate, OrderCancel

router = APIRouter(prefix="/api/orders")

EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_REGEX = re.compile(r"^(0|\+84)\d{8,10}$")
MAX_ITEMS_PER_ORDER = 30
MAX_ITEM_QUANTITY = 20


def _clean_text(value: str) -> str:
    return (value or "").strip()

@router.post("")
async def create_order(payload: OrderCreate, db: AsyncSession = Depends(get_db)):
    customer = payload.customer
    user = payload.user
    items = payload.items
    payment_method = _clean_text(payload.paymentMethod)
    normalized_payment_method = payment_method.lower()
    allowed_payment_methods = {"qr", "cod"}
    customer_name = _clean_text(customer.name)
    customer_email = _clean_text(customer.email).lower()
    customer_phone = re.sub(r"[\s.-]", "", _clean_text(customer.phone))
    customer_address = _clean_text(customer.address)
    customer_city = _clean_text(customer.city)
    customer_note = _clean_text(customer.note)
    
    if not customer_name or not customer_email or not customer_phone or \
       not customer_address or not customer_city or not items or not payment_method:
        raise HTTPException(status_code=400, detail="Missing required order data")

    if len(items) > MAX_ITEMS_PER_ORDER:
        raise HTTPException(status_code=400, detail=f"Each order supports up to {MAX_ITEMS_PER_ORDER} products")

    if len(customer_name) < 2:
        raise HTTPException(status_code=400, detail="Customer name is too short")

    if len(customer_address) < 6:
        raise HTTPException(status_code=400, detail="Shipping address is too short")

    if len(customer_city) < 2:
        raise HTTPException(status_code=400, detail="Shipping city is required")

    if len(customer_note) > 500:
        raise HTTPException(status_code=400, detail="Order note is too long")

    if not EMAIL_REGEX.match(customer_email):
        raise HTTPException(status_code=400, detail="Customer email is invalid")

    if not PHONE_REGEX.match(customer_phone):
        raise HTTPException(status_code=400, detail="Customer phone is invalid")

    if normalized_payment_method not in allowed_payment_methods:
        raise HTTPException(status_code=400, detail="Payment method is not supported")
        
    user_email = _clean_text(user.email if user else customer_email).lower()
    user_name = _clean_text(user.name if user and user.name else customer_name)
    user_role = _clean_text(user.role if user else "customer") or "customer"

    if not EMAIL_REGEX.match(user_email):
        raise HTTPException(status_code=400, detail="User email is invalid")
    
    # upsert user
    u_res = await db.execute(select(User).filter(User.email == user_email))
    existing_user = u_res.scalars().first()
    if existing_user:
        existing_user.name = user_name
        existing_user.role = user_role
    else:
        new_user = User(
            user_id=str(uuid.uuid4()),
            name=user_name,
            email=user_email,
            role=user_role
        )
        db.add(new_user)
        
    total_price = 0
    normalized_items = []
    
    for item in items:
        pid = item.get_product_id()
        if pid is None:
            raise HTTPException(status_code=400, detail="Invalid product in cart")
            
        quantity = int(item.quantity or 0)
        if quantity <= 0:
            raise HTTPException(status_code=400, detail=f"Invalid quantity for product {pid}")

        if quantity > MAX_ITEM_QUANTITY:
            raise HTTPException(status_code=400, detail=f"Quantity cannot exceed {MAX_ITEM_QUANTITY} per product")
        
        p_res = await db.execute(select(Phone).filter(Phone.id == pid))
        product = p_res.scalars().first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product not found: {pid}")
            
        stock = product.stock or 0
        if stock < quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock for {product.name}")
            
        price = int(round(product.price or 0))
        if price <= 0:
            raise HTTPException(status_code=400, detail=f"Product has invalid price: {product.name}")

        total_price += price * quantity
        
        normalized_items.append({
            "productId": product.id,
            "productName": product.name,
            "brand": product.brand,
            "quantity": quantity,
            "price": price,
            "imageUrl": product.image_url
        })
        
        product.stock = stock - quantity

    if total_price <= 0:
        raise HTTPException(status_code=400, detail="Order total must be greater than 0")
        
    order_id = str(uuid.uuid4())
    new_order = Order(
        order_id=order_id,
        user_email=user_email,
        user_name=user_name,
        user_role=user_role,
        shipping_name=customer_name,
        shipping_email=customer_email,
        shipping_phone=customer_phone,
        shipping_address=customer_address,
        shipping_city=customer_city,
        note=customer_note,
        payment_method=normalized_payment_method,
        status="pending",
        total_price=total_price
    )
    db.add(new_order)
    
    for ni in normalized_items:
        new_oi = OrderItem(
            order_item_id=str(uuid.uuid4()),
            order_id=order_id,
            product_id=ni["productId"],
            product_name=ni["productName"],
            brand=ni["brand"],
            quantity=ni["quantity"],
            price=ni["price"],
            image_url=ni["imageUrl"]
        )
        db.add(new_oi)
        
    new_payment = Payment(
        payment_id=str(uuid.uuid4()),
        order_id=order_id,
        payment_method=normalized_payment_method,
        payment_status="pending"
    )
    db.add(new_payment)
    
    await db.commit()
    
    return {
        "success": True,
        "data": {
            "orderId": order_id,
            "totalPrice": total_price,
            "items": normalized_items,
            "status": "pending"
        }
    }

@router.get("/user/{email}")
async def get_user_orders(email: str, db: AsyncSession = Depends(get_db)):
    email = email.lower().strip()
    
    result = await db.execute(select(Order).filter(Order.user_email == email).order_by(Order.created_at.desc()))
    orders = result.scalars().all()
    
    orders_with_items = []
    for order in orders:
        i_res = await db.execute(select(OrderItem).filter(OrderItem.order_id == order.order_id).order_by(OrderItem.product_name.asc()))
        items = i_res.scalars().all()
        
        order_dict = {
            c.name: getattr(order, c.name) for c in order.__table__.columns
        }
        order_dict["items"] = [
            {c.name: getattr(i, c.name) for c in i.__table__.columns} for i in items
        ]
        orders_with_items.append(order_dict)
        
    return {"success": True, "data": orders_with_items}

@router.patch("/{id}/cancel")
async def cancel_order(id: str, payload: OrderCancel, db: AsyncSession = Depends(get_db)):
    user_email = payload.userEmail.strip().lower()
    comment = (payload.comment or "").strip()
    if not id or not user_email:
        raise HTTPException(status_code=400, detail="Missing order information")
        
    result = await db.execute(select(Order).filter(Order.order_id == id))
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.user_email.strip().lower() != user_email:
        raise HTTPException(status_code=403, detail="You can only cancel your own orders")
        
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="Chỉ có thể huỷ đơn khi quản lý kho chưa duyệt")
        
    i_res = await db.execute(select(OrderItem).filter(OrderItem.order_id == id))
    items = i_res.scalars().all()
    
    for item in items:
        p_res = await db.execute(select(Phone).filter(Phone.id == item.product_id))
        phone = p_res.scalars().first()
        if phone:
            phone.stock = (phone.stock or 0) + item.quantity

    if comment:
        cancel_note = f"[Khách huỷ] {comment}"
        current_note = (order.note or "").strip()
        if current_note:
            order.note = f"{current_note}\n{cancel_note}" if cancel_note not in current_note else current_note
        else:
            order.note = cancel_note
            
    order.status = "cancelled"
    
    pay_res = await db.execute(select(Payment).filter(Payment.order_id == id))
    payment = pay_res.scalars().first()
    if payment:
        payment.payment_status = "cancelled"
        
    await db.commit()
    await db.refresh(order)
    
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
    
    return {"success": True, "data": order_dict}
