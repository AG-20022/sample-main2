from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.database import Base


class InvoiceMaster(Base):
    __tablename__ = "InvoiceMaster"

    invoice_number: Mapped[str] = mapped_column(String(32), primary_key=True)
    invoice_date: Mapped[date] = mapped_column(Date)
    order_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(160))
    bill_to_company: Mapped[str] = mapped_column(String(160))
    bill_to_address: Mapped[str] = mapped_column(Text)
    ship_to_company: Mapped[str] = mapped_column(String(160))
    ship_to_address: Mapped[str] = mapped_column(Text)
    customer_email: Mapped[str] = mapped_column(String(255))
    customer_phone: Mapped[str] = mapped_column(String(32))
    contract_number: Mapped[str] = mapped_column(String(64))
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    total_amount: Mapped[float] = mapped_column(Float, default=0)
    tax_amount: Mapped[float] = mapped_column(Float, default=0)
    invoice_status: Mapped[str] = mapped_column(String(32), default="Open")
    fedex_tracking_number: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    consignment_available: Mapped[bool] = mapped_column(Boolean, default=False)
    created_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    line_items: Mapped[list[InvoiceLineItem]] = relationship(back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLineItem(Base):
    __tablename__ = "InvoiceLineItems"

    line_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    invoice_number: Mapped[str] = mapped_column(ForeignKey("InvoiceMaster.invoice_number"), index=True)
    product_code: Mapped[str] = mapped_column(String(32))
    product_name: Mapped[str] = mapped_column(String(160))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    line_amount: Mapped[float] = mapped_column(Float, default=0)
    hsn_code: Mapped[str] = mapped_column(String(32))
    country_of_origin: Mapped[str] = mapped_column(String(64), default="United States")
    invoice: Mapped[InvoiceMaster] = relationship(back_populates="line_items")


class ProductCatalogFedex(Base):
    __tablename__ = "ProductCatalog"

    product_code: Mapped[str] = mapped_column(String(32), primary_key=True)
    product_name: Mapped[str] = mapped_column(String(160))
    product_category: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text)
    hsn_code: Mapped[str] = mapped_column(String(32))
    unit_price: Mapped[float] = mapped_column(Float)
    uom: Mapped[str] = mapped_column(String(16), default="EA")
    active_flag: Mapped[bool] = mapped_column(Boolean, default=True)


class ConsignmentDetails(Base):
    __tablename__ = "ConsignmentDetails"

    tracking_number: Mapped[str] = mapped_column(String(32), primary_key=True)
    awb_number: Mapped[str] = mapped_column(String(32), unique=True)
    shipment_type: Mapped[str] = mapped_column(String(32), default="International")
    fedex_service: Mapped[str] = mapped_column(String(80))
    ship_date: Mapped[date] = mapped_column(Date)
    pickup_date: Mapped[date] = mapped_column(Date)
    booking_reference: Mapped[str] = mapped_column(String(64))
    shipper_name: Mapped[str] = mapped_column(String(160))
    shipper_address: Mapped[str] = mapped_column(Text)
    shipper_phone: Mapped[str] = mapped_column(String(32))
    shipper_email: Mapped[str] = mapped_column(String(255))
    recipient_name: Mapped[str] = mapped_column(String(160))
    recipient_address: Mapped[str] = mapped_column(Text)
    recipient_phone: Mapped[str] = mapped_column(String(32))
    recipient_email: Mapped[str] = mapped_column(String(255))
    total_pieces: Mapped[int] = mapped_column(Integer, default=1)
    total_actual_weight: Mapped[float] = mapped_column(Float, default=0)
    total_chargeable_weight: Mapped[float] = mapped_column(Float, default=0)
    shipment_purpose: Mapped[str] = mapped_column(String(80), default="Commercial")
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    total_customs_value: Mapped[float] = mapped_column(Float, default=0)
    order_status: Mapped[str] = mapped_column(String(48), default="In Transit")
    workflow_status: Mapped[str] = mapped_column(String(48), default="Shipment in transit")


class CustomerEmail(Base):
    __tablename__ = "CustomerEmails"

    email_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sender_email: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(255))
    email_body: Mapped[str] = mapped_column(Text)
    invoice_number: Mapped[str] = mapped_column(String(32), index=True)
    order_number: Mapped[str] = mapped_column(String(32), index=True)
    tracking_number: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    received_date: Mapped[datetime] = mapped_column(DateTime)
    activity_status: Mapped[str] = mapped_column(String(32), default="New")
