from pydantic import BaseModel
from typing import Dict, List, Optional

class UserRegistration(BaseModel):
    name: str
    email: str
    password: Optional[str] = None
    phone: Optional[str] = None

class AdminUserCreate(BaseModel):
    name: str
    email: str
    password: Optional[str] = None
    role: Optional[str] = "customer"
    phone: Optional[str] = None
    status: Optional[str] = "active"

class AdminUserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None

class OrderCustomer(BaseModel):
    name: str
    email: str
    phone: str
    address: str
    city: Optional[str] = None
    note: Optional[str] = None

class OrderUser(BaseModel):
    email: str
    name: Optional[str] = None
    role: Optional[str] = "customer"

class OrderItem(BaseModel):
    id: Optional[int] = None
    product_id: Optional[int] = None
    productId: Optional[int] = None
    quantity: Optional[int] = 1

    def get_product_id(self) -> int:
        return self.id or self.product_id or self.productId

class OrderCreate(BaseModel):
    customer: OrderCustomer
    user: Optional[OrderUser] = None
    items: List[OrderItem]
    paymentMethod: str

class InventoryUpdate(BaseModel):
    stock: Optional[int] = None
    minStock: Optional[int] = None

class OrderStatusUpdate(BaseModel):
    status: str
    comment: Optional[str] = None

class WarehouseProductCreate(BaseModel):
    name: str
    brand: str
    price: float
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    stock: Optional[int] = 0
    minStock: Optional[int] = 10
    rating: Optional[float] = 0
    reviewCount: Optional[int] = 0
    ram: Optional[str] = None
    rom: Optional[str] = None
    battery: Optional[str] = None
    category: Optional[str] = None
    specs: Optional[Dict[str, str]] = None

class OrderCancel(BaseModel):
    userEmail: str

class ErrorResponse(BaseModel):
    message: str
