from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class FedexBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ProductCreate(BaseModel):
    product_code: str = Field(min_length=2)
    product_name: str
    product_category: str
    description: str
    hsn_code: str
    unit_price: float = Field(ge=0)
    uom: str = "EA"
    active_flag: bool = True


class ProductResponse(ProductCreate, FedexBase):
    pass


class InvoiceLinePayload(BaseModel):
    product_code: str
    product_name: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)
    hsn_code: str
    country_of_origin: str = "United States"


class InvoiceCreate(BaseModel):
    invoice_number: str
    invoice_date: date
    order_number: str
    customer_name: str
    bill_to_company: str
    bill_to_address: str
    ship_to_company: str
    ship_to_address: str
    customer_email: str
    customer_phone: str
    contract_number: str
    currency: str = "USD"
    invoice_status: str = "Open"
    fedex_tracking_number: str | None = None
    consignment_available: bool = False
    line_items: list[InvoiceLinePayload] = []


class InvoiceResponse(InvoiceCreate, FedexBase):
    total_amount: float
    tax_amount: float
    created_date: datetime


class EmailResponse(FedexBase):
    email_id: int
    sender_email: str
    subject: str
    email_body: str
    invoice_number: str
    order_number: str
    tracking_number: str | None
    received_date: datetime
    activity_status: str


class ConsignmentResponse(FedexBase):
    tracking_number: str
    awb_number: str
    shipment_type: str
    fedex_service: str
    ship_date: date
    pickup_date: date
    booking_reference: str
    shipper_name: str
    shipper_address: str
    shipper_phone: str
    shipper_email: str
    recipient_name: str
    recipient_address: str
    recipient_phone: str
    recipient_email: str
    total_pieces: int
    total_actual_weight: float
    total_chargeable_weight: float
    shipment_purpose: str
    currency: str
    total_customs_value: float
    order_status: str
    workflow_status: str


class OrderStatusResponse(BaseModel):
    invoice_number: str
    order_number: str
    invoice_status: str
    tracking_available: bool
    tracking_number: str | None
    consignment: ConsignmentResponse | None = None
    responsible_role: str
    pending_activity: str
    expected_completion_date: date | None
