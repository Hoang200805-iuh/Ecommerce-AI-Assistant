from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.db.base import Base

class Phone(Base):
    __tablename__ = "phones"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    brand = Column(String, nullable=False)
    price = Column(Float)
    rating = Column(Float)
    description = Column(Text)
    image_url = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    specs = Column(Text)
    reviews = Column(Text)
    stock = Column(Integer, server_default="10")
    min_stock = Column(Integer, server_default="10")
    ram = Column(Text)
    rom = Column(Text)
    battery = Column(Text)
    review_count = Column(Integer, server_default="0")
    category = Column(Text)

class Spec(Base):
    __tablename__ = "specs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    phone_id = Column(Integer, ForeignKey("phones.id"), nullable=False)
    spec_key = Column(Text)
    spec_value = Column(Text)

class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, autoincrement=True)
    phone_id = Column(Integer, ForeignKey("phones.id"), nullable=False)
    reviewer_name = Column(Text)
    rating = Column(Integer)
    comment = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

class User(Base):
    __tablename__ = "users"
    user_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password = Column(String)
    role = Column(String, nullable=False, server_default="customer")
    phone = Column(String)
    status = Column(String, nullable=False, server_default="active")
    created_at = Column(String, server_default=func.current_timestamp())

class Order(Base):
    __tablename__ = "orders"
    order_id = Column(String, primary_key=True)
    user_email = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    user_role = Column(String, nullable=False, server_default="customer")
    shipping_name = Column(String, nullable=False)
    shipping_email = Column(String, nullable=False)
    shipping_phone = Column(String, nullable=False)
    shipping_address = Column(String, nullable=False)
    shipping_city = Column(String)
    note = Column(String)
    payment_method = Column(String, nullable=False)
    status = Column(String, nullable=False, server_default="pending")
    total_price = Column(Integer, nullable=False)
    created_at = Column(String, server_default=func.current_timestamp())

class OrderItem(Base):
    __tablename__ = "order_items"
    order_item_id = Column(String, primary_key=True)
    order_id = Column(String, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, nullable=False)
    product_name = Column(String, nullable=False)
    brand = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Integer, nullable=False)
    image_url = Column(Text)

class Payment(Base):
    __tablename__ = "payments"
    payment_id = Column(String, primary_key=True)
    order_id = Column(String, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False, unique=True)
    payment_method = Column(String, nullable=False)
    payment_status = Column(String, nullable=False, server_default="pending")
    payment_date = Column(String)
