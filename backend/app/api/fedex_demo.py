from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.fedex_models import ConsignmentDetails, CustomerEmail, InvoiceMaster, ProductCatalogFedex
from backend.app.schemas.fedex import ConsignmentResponse, EmailResponse, InvoiceCreate, InvoiceResponse, OrderStatusResponse, ProductCreate, ProductResponse
from backend.app.services.fedex_demo_service import get_consignment, get_invoice, save_invoice, save_product, serialize_invoice, serialize_product

router = APIRouter(prefix="/api", tags=["fedex-customer-operations"])


@router.get("/invoices", response_model=list[InvoiceResponse])
def list_invoices(search: str = Query(default=""), db: Session = Depends(get_db)):
    invoices = db.scalars(select(InvoiceMaster).order_by(InvoiceMaster.created_date.desc())).all()
    if search.strip():
        needle = search.casefold()
        invoices = [item for item in invoices if needle in item.invoice_number.casefold() or needle in item.order_number.casefold() or needle in item.customer_name.casefold()]
    return [serialize_invoice(item) for item in invoices]


@router.get("/invoices/{invoice_number}", response_model=InvoiceResponse)
def invoice_detail(invoice_number: str, db: Session = Depends(get_db)):
    return serialize_invoice(get_invoice(db, invoice_number))


@router.post("/invoices", response_model=InvoiceResponse)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db)):
    return serialize_invoice(save_invoice(db, payload))


@router.put("/invoices/{invoice_number}", response_model=InvoiceResponse)
def update_invoice(invoice_number: str, payload: InvoiceCreate, db: Session = Depends(get_db)):
    invoice = get_invoice(db, invoice_number)
    return serialize_invoice(save_invoice(db, payload, invoice))


@router.get("/products", response_model=list[ProductResponse])
def list_products(search: str = Query(default=""), db: Session = Depends(get_db)):
    products = db.scalars(select(ProductCatalogFedex).order_by(ProductCatalogFedex.product_code)).all()
    if search.strip():
        needle = search.casefold()
        products = [item for item in products if needle in item.product_code.casefold() or needle in item.product_name.casefold()]
    return [serialize_product(item) for item in products]


@router.post("/products", response_model=ProductResponse)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    return save_product(db, payload)


@router.get("/consignments", response_model=list[ConsignmentResponse])
def list_consignments(search: str = Query(default=""), db: Session = Depends(get_db)):
    consignments = db.scalars(select(ConsignmentDetails).order_by(ConsignmentDetails.ship_date.desc())).all()
    if search.strip():
        needle = search.casefold()
        consignments = [item for item in consignments if needle in item.tracking_number.casefold() or needle in item.recipient_name.casefold()]
    return consignments


@router.get("/consignments/{tracking_number}", response_model=ConsignmentResponse)
def consignment_detail(tracking_number: str, db: Session = Depends(get_db)):
    return get_consignment(db, tracking_number)


@router.get("/emails", response_model=list[EmailResponse])
def list_emails(search: str = Query(default=""), db: Session = Depends(get_db)):
    emails = db.scalars(select(CustomerEmail).order_by(CustomerEmail.received_date.desc())).all()
    if search.strip():
        needle = search.casefold()
        emails = [item for item in emails if needle in item.subject.casefold() or needle in item.invoice_number.casefold() or needle in item.sender_email.casefold()]
    return emails


@router.get("/emails/{email_id}", response_model=EmailResponse)
def email_detail(email_id: int, db: Session = Depends(get_db)):
    email = db.get(CustomerEmail, email_id)
    if not email:
        from fastapi import HTTPException
        raise HTTPException(404, "Email not found")
    return email


@router.get("/order-status/{invoice_number}", response_model=OrderStatusResponse)
def order_status(invoice_number: str, db: Session = Depends(get_db)):
    invoice = get_invoice(db, invoice_number)
    consignment = get_consignment(db, invoice.fedex_tracking_number) if invoice.fedex_tracking_number else None
    return {
        "invoice_number": invoice.invoice_number,
        "order_number": invoice.order_number,
        "invoice_status": invoice.invoice_status,
        "tracking_available": consignment is not None,
        "tracking_number": invoice.fedex_tracking_number,
        "consignment": consignment,
        "responsible_role": "Logistics Coordinator" if consignment else "Order Management Specialist",
        "pending_activity": "Monitor delivery and confirm recipient receipt" if consignment else "Create shipment booking and provide tracking number",
        "expected_completion_date": consignment.ship_date if consignment else None,
    }
