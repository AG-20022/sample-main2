from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from backend.app.db.fedex_models import ConsignmentDetails, CustomerEmail, InvoiceLineItem, InvoiceMaster, ProductCatalogFedex
from backend.app.schemas.fedex import InvoiceCreate, ProductCreate

PRODUCTS = [
    ("FDX-SEN-100", "Precision pressure sensor", "Medical sensors", "Sterile pressure sensor for device monitoring", "902620", 184.0),
    ("FDX-CBL-210", "Shielded data cable", "Connectivity", "EMI-shielded replacement cable assembly", "854442", 42.5),
    ("FDX-FLT-310", "Air filtration cartridge", "Consumables", "HEPA replacement cartridge", "842199", 76.0),
    ("FDX-TRM-415", "Thermal transfer module", "Equipment", "Calibrated thermal transfer module", "841990", 325.0),
    ("FDX-VAL-520", "Flow control valve", "Components", "Precision flow control valve", "848180", 129.0),
]
PRODUCTS.extend(
    (f"FDX-CMP-{index:03d}", f"Clinical component {index}", "Medical components", f"US medical device component {index} for service replacement", f"901890", round(35 + index * 7.5, 2))
    for index in range(6, 26)
)
CITY_DATA = [
    ("Avery Thompson", "Northstar Medical", "1200 Market Street, Philadelphia, PA 19107", "215-555-0101"),
    ("Morgan Reed", "Cascade Health Systems", "500 Pike Street, Seattle, WA 98101", "206-555-0102"),
    ("Jordan Brooks", "Lone Star Surgical", "901 Main Street, Dallas, TX 75201", "214-555-0103"),
    ("Taylor Morgan", "Hudson Clinical Group", "11 Madison Avenue, New York, NY 10010", "212-555-0104"),
    ("Casey Parker", "Pacific Biomedical", "300 California Street, San Francisco, CA 94104", "415-555-0105"),
]
CUSTOMER_DATA = [
    (f"{first} {last}", f"{company} Medical", f"{100 + index} {street}, {city}, {state} {90000 + index}", f"{area}-555-{index:04d}")
    for index, (first, last, company, street, city, state, area) in enumerate([
        ("Avery", "Thompson", "Northstar", "Market Street", "Philadelphia", "PA", "215"), ("Morgan", "Reed", "Cascade", "Pike Street", "Seattle", "WA", "206"),
        ("Jordan", "Brooks", "Lone Star", "Main Street", "Dallas", "TX", "214"), ("Taylor", "Morgan", "Hudson", "Madison Avenue", "New York", "NY", "212"),
        ("Casey", "Parker", "Pacific", "California Street", "San Francisco", "CA", "415"),
    ] * 10, start=1)
]


def _tracking(index: int) -> str:
    return f"7734{index:08d}"


def seed_fedex_demo(db: Session) -> None:
    if db.scalar(select(func.count()).select_from(ProductCatalogFedex)):
        if db.get(InvoiceMaster, "INV-1001") and db.scalar(select(func.count()).select_from(ProductCatalogFedex)) == 25:
            return
        db.query(InvoiceLineItem).delete(synchronize_session=False)
        db.query(CustomerEmail).delete(synchronize_session=False)
        db.query(ConsignmentDetails).delete(synchronize_session=False)
        db.query(InvoiceMaster).delete(synchronize_session=False)
        db.query(ProductCatalogFedex).delete(synchronize_session=False)
        db.commit()
    for code, name, category, description, hsn, price in PRODUCTS:
        db.add(ProductCatalogFedex(product_code=code, product_name=name, product_category=category, description=description, hsn_code=hsn, unit_price=price, uom="EA", active_flag=True))
    for index in range(1, 101):
        person, company, address, phone = CUSTOMER_DATA[(index - 1) % len(CUSTOMER_DATA)]
        invoice_number = f"INV-{1000 + index}"
        order_number = f"SO-{10000 + index}"
        tracking = _tracking(index) if index <= 75 else None
        line_one = PRODUCTS[(index - 1) % len(PRODUCTS)]
        line_two = PRODUCTS[index % len(PRODUCTS)]
        quantity_one, quantity_two = 1 + index % 3, 1 + (index + 1) % 2
        subtotal = line_one[5] * quantity_one + line_two[5] * quantity_two
        invoice = InvoiceMaster(
            invoice_number=invoice_number, invoice_date=date(2026, 9, 1) + timedelta(days=index % 30), order_number=order_number,
            customer_name=person, bill_to_company=company, bill_to_address=address, ship_to_company=company,
            ship_to_address=address, customer_email=f"{person.lower().replace(' ', '.')}@example.com", customer_phone=phone,
            contract_number=f"CTR-{2026 + index % 3}-{index:04d}", currency="USD", total_amount=round(subtotal * 1.0825, 2),
            tax_amount=round(subtotal * 0.0825, 2), invoice_status="Paid" if index % 3 == 0 else "Open",
            fedex_tracking_number=tracking, consignment_available=tracking is not None,
        )
        invoice.line_items = [
            InvoiceLineItem(invoice_number=invoice_number, product_code=line_one[0], product_name=line_one[1], quantity=quantity_one, unit_price=line_one[5], line_amount=round(line_one[5] * quantity_one, 2), hsn_code=line_one[4]),
            InvoiceLineItem(invoice_number=invoice_number, product_code=line_two[0], product_name=line_two[1], quantity=quantity_two, unit_price=line_two[5], line_amount=round(line_two[5] * quantity_two, 2), hsn_code=line_two[4]),
        ]
        db.add(invoice)
        if tracking:
            ship_date = date(2026, 10, 1) + timedelta(days=index % 10)
            db.add(ConsignmentDetails(
                tracking_number=tracking, awb_number=f"AWB-US-{index:06d}", shipment_type="International", fedex_service="FedEx International Priority",
                ship_date=ship_date, pickup_date=ship_date + timedelta(days=1), booking_reference=f"BK-{order_number}", shipper_name="FedEx Medical Logistics",
                shipper_address="3875 Airways Boulevard, Memphis, TN 38116", shipper_phone="800-463-3339", shipper_email="logistics@fedex.example.com",
                recipient_name=person, recipient_address=address, recipient_phone=phone, recipient_email=f"{person.lower().replace(' ', '.')}@example.com",
                total_pieces=1 + index % 4, total_actual_weight=round(8.5 + index % 12, 1), total_chargeable_weight=round(10.0 + index % 12, 1),
                shipment_purpose="Commercial", currency="USD", total_customs_value=round(subtotal, 2), order_status="In Transit" if index % 4 else "Delivered", workflow_status="Shipment in transit",
            ))
        subject = f"Can you provide me the FedEx tracking number for Invoice {invoice_number}?" if index == 1 else f"Question about order {order_number} and invoice {invoice_number}"
        db.add(CustomerEmail(sender_email=f"{person.lower().replace(' ', '.')}@example.com", subject=subject, email_body=f"Hello team,\n\nCould you please confirm the shipment status for {invoice_number}? We need the FedEx tracking number and expected delivery date.\n\nThank you,\n{person}", invoice_number=invoice_number, order_number=order_number, tracking_number=tracking, received_date=datetime(2026, 10, 10, 9, 0) + timedelta(hours=index % 8), activity_status="New" if index == 1 else "Processed"))
    db.commit()


def serialize_product(product: ProductCatalogFedex) -> dict:
    return {key: getattr(product, key) for key in ("product_code", "product_name", "product_category", "description", "hsn_code", "unit_price", "uom", "active_flag")}


def serialize_invoice(invoice: InvoiceMaster) -> dict:
    return {"invoice_number": invoice.invoice_number, "invoice_date": invoice.invoice_date, "order_number": invoice.order_number, "customer_name": invoice.customer_name, "bill_to_company": invoice.bill_to_company, "bill_to_address": invoice.bill_to_address, "ship_to_company": invoice.ship_to_company, "ship_to_address": invoice.ship_to_address, "customer_email": invoice.customer_email, "customer_phone": invoice.customer_phone, "contract_number": invoice.contract_number, "currency": invoice.currency, "total_amount": invoice.total_amount, "tax_amount": invoice.tax_amount, "invoice_status": invoice.invoice_status, "fedex_tracking_number": invoice.fedex_tracking_number, "consignment_available": invoice.consignment_available, "created_date": invoice.created_date, "line_items": [{"product_code": item.product_code, "product_name": item.product_name, "quantity": item.quantity, "unit_price": item.unit_price, "line_amount": item.line_amount, "hsn_code": item.hsn_code, "country_of_origin": item.country_of_origin} for item in invoice.line_items]}


def get_invoice(db: Session, invoice_number: str) -> InvoiceMaster:
    invoice = db.scalar(select(InvoiceMaster).options(joinedload(InvoiceMaster.line_items)).where(InvoiceMaster.invoice_number == invoice_number))
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    return invoice


def get_consignment(db: Session, tracking_number: str) -> ConsignmentDetails:
    consignment = db.get(ConsignmentDetails, tracking_number)
    if not consignment:
        raise HTTPException(404, "Consignment not found")
    return consignment


def save_product(db: Session, payload: ProductCreate) -> ProductCatalogFedex:
    if db.get(ProductCatalogFedex, payload.product_code):
        raise HTTPException(409, "Product code already exists")
    product = ProductCatalogFedex(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def save_invoice(db: Session, payload: InvoiceCreate, existing: InvoiceMaster | None = None) -> InvoiceMaster:
    invoice = existing or InvoiceMaster(invoice_number=payload.invoice_number)
    if not existing and db.get(InvoiceMaster, payload.invoice_number):
        raise HTTPException(409, "Invoice number already exists")
    values = payload.model_dump(exclude={"line_items"})
    for key, value in values.items():
        setattr(invoice, key, value)
    invoice.total_amount = round(sum(item.quantity * item.unit_price for item in payload.line_items) * 1.0825, 2)
    invoice.tax_amount = round(invoice.total_amount / 1.0825 * 0.0825, 2)
    if existing:
        existing.line_items.clear()
    invoice.line_items = [InvoiceLineItem(**item.model_dump(), invoice_number=invoice.invoice_number, line_amount=round(item.quantity * item.unit_price, 2)) for item in payload.line_items]
    db.add(invoice)
    db.commit()
    return get_invoice(db, invoice.invoice_number)
