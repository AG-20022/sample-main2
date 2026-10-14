from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.models import CompanyMaster, CustomerMaster, InvoiceHeader, InvoiceItem, ProductCatalog


COMPANIES = [
    {
        "company_id": "CMP-ACME",
        "company_name": "VIVIFY Medical Supplies",
        "gstin": "",
        "pan": "",
        "phone": "+1 813-588-5150",
        "email": "accounts@vivify.example",
        "address": "1000 W Kennedy Blvd #202, Tampa, FL 33606",
        "ship_from_address": "VIVIFY Distribution Center, Tampa, FL 33619",
    },
    {
        "company_id": "CMP-CONTOSO",
        "company_name": "Barrett Plastic Surgery",
        "gstin": "",
        "pan": "",
        "phone": "+1 310-598-2648",
        "email": "billing@barrettplasticsurgery.example",
        "address": "9701 Wilshire Blvd, Beverly Hills, CA 90212",
        "ship_from_address": "Barrett Clinical Supply Warehouse, Los Angeles, CA 90045",
    },
    {
        "company_id": "CMP-NORTHWIND",
        "company_name": "USA Health Breast Endocrine & General Surgery",
        "gstin": "",
        "pan": "",
        "phone": "+1 251-660-5763",
        "email": "purchasing@usahealth.example",
        "address": "1601 Center St Ste 2K, Mobile, AL 36604",
        "ship_from_address": "USA Health Surgical Center Receiving, Mobile, AL 36604",
    },
    {
        "company_id": "CMP-WIPRO",
        "company_name": "The American Society of Breast Surgeons",
        "gstin": "",
        "pan": "",
        "phone": "+1 877-992-5470",
        "email": "operations@breastsurgeons.example",
        "address": "7067 Columbia Gateway Dr Ste 290, Columbia, MD 21046",
        "ship_from_address": "ASBrS Education and Supply Center, Columbia, MD 21046",
    },
]

CUSTOMERS = [
    ("CUS-APOLLO", "Dr. Lily Lee, MD", "", "US", "Lily Lee", "+1 626-817-0818"),
    ("CUS-CITYCARE", "VIVIFY", "", "US", "VIVIFY Front Desk", "+1 813-588-5150"),
    ("CUS-CONTOSO", "Barrett Plastic Surgery", "", "US", "Barrett Scheduling", "+1 310-598-2648"),
    ("CUS-FORTIS", "USA Health Breast Endocrine & General Surgery", "", "US", "Surgical Center Team", "+1 251-660-5763"),
    ("CUS-KOCHI", "The American Society of Breast Surgeons", "", "US", "Member Services", "+1 877-992-5470"),
    ("CUS-KOLKATA", "Tampa Surgical Partners", "", "US", "Megan Carter", "+1 813-555-0142"),
    ("CUS-LUCKNOW", "Pasadena Reconstructive Institute", "", "US", "Dr. Aaron Brooks", "+1 626-555-0191"),
    ("CUS-MEDPLUS", "Mobile Endocrine Clinic", "", "US", "Rachel Williams", "+1 251-555-0135"),
    ("CUS-NORTHSTAR", "Columbia Breast Center", "", "US", "Karen Mitchell", "+1 410-555-0164"),
    ("CUS-SUNRISE", "Beverly Hills Surgical Group", "", "US", "Daniel Foster", "+1 310-555-0178"),
]

PRODUCTS = [
    ("PRD-MAINT", "Annual Equipment Maintenance", "811219", "Year", 2500, 0),
    ("PRD-BP", "Clinical Blood Pressure Monitor", "901890", "Each", 149.99, 0),
    ("PRD-CAL", "Device Calibration Service", "998346", "Visit", 350.00, 0),
    ("PRD-THERMO", "Digital Clinical Thermometer", "902519", "Each", 39.95, 0),
    ("PRD-SYRINGE", "Sterile Syringe 5ml (Pack of 100)", "901831", "Pack", 62.00, 0),
    ("PRD-EQUIP", "Surgical Equipment Installation", "998729", "Hour", 120.00, 0),
    ("PRD-WHEEL", "Foldable Clinical Wheelchair", "871310", "Each", 649.00, 0),
    ("PRD-GLUCO", "Continuous Glucose Monitor Kit", "902789", "Kit", 124.95, 0),
    ("PRD-BED", "Hospital Bed Mattress", "940421", "Each", 865.00, 0),
    ("PRD-CANNULA", "IV Cannula 20G (Pack of 50)", "901839", "Pack", 147.50, 0),
    ("PRD-OXIMETER", "Pulse Oximeter", "901819", "Each", 85.00, 0),
]


def _ensure_master(db: Session, model: type, key: str, values: dict) -> None:
    record = db.get(model, values[key])
    if record is None:
        db.add(model(**values))
    else:
        for field, value in values.items():
            setattr(record, field, value)


def ensure_invoice_demo_data(db: Session) -> None:
    for company in COMPANIES:
        _ensure_master(db, CompanyMaster, "company_id", company)
    for customer_id, name, gstin, state_code, contact, phone in CUSTOMERS:
        _ensure_master(db, CustomerMaster, "customer_id", {
            "customer_id": customer_id,
            "customer_name": name,
            "gstin": gstin,
            "contact_person": contact,
            "phone": phone,
            "email": f"{customer_id.lower()}@example",
            "billing_address": f"{name}, Main Road, {state_code}",
            "shipping_address": f"{name}, Receiving Gate, {state_code}",
            "state_code": state_code,
        })
    for product_id, name, hsn_sac, unit, rate, gst in PRODUCTS:
        _ensure_master(db, ProductCatalog, "product_id", {
            "product_id": product_id,
            "product_name": name,
            "hsn_sac": hsn_sac,
            "unit": unit,
            "rate": rate,
            "gst_percentage": gst,
        })
    db.flush()

    legacy_invoice_numbers = {"NWS/26-27/0003", "INV-202610-0002", "WMD/26-27/0005", "CMT/26-27/0003"}
    for legacy_invoice in db.scalars(select(InvoiceHeader).where(InvoiceHeader.invoice_no.in_(legacy_invoice_numbers))).all():
        db.delete(legacy_invoice)
    db.flush()

    invoice_specs = [
        ("US-VIV-1001", date(2026, 10, 11), date(2026, 11, 10), "PO-VIV-2296", "CMP-ACME", "CUS-CITYCARE", [("PRD-CANNULA", 12), ("PRD-OXIMETER", 8), ("PRD-CAL", 1)]),
        ("US-LILY-1002", date(2026, 10, 10), date(2026, 11, 9), "PO-LILY-1042", "CMP-CONTOSO", "CUS-APOLLO", [("PRD-BP", 5), ("PRD-THERMO", 10)]),
        ("US-USA-1003", date(2026, 10, 9), date(2026, 11, 8), "PO-USA-7781", "CMP-NORTHWIND", "CUS-FORTIS", [("PRD-MAINT", 1), ("PRD-GLUCO", 4)]),
        ("US-ASBS-1004", date(2026, 10, 6), date(2026, 10, 21), "PO-ASBS-4403", "CMP-WIPRO", "CUS-KOCHI", [("PRD-SYRINGE", 20), ("PRD-EQUIP", 2)]),
    ]
    for invoice_no, invoice_date, due_date, po_reference, company_id, customer_id, lines in invoice_specs:
        invoice = db.scalar(select(InvoiceHeader).where(InvoiceHeader.invoice_no == invoice_no))
        if invoice is None:
            invoice = InvoiceHeader(invoice_no=invoice_no)
        invoice.invoice_date = invoice_date
        invoice.due_date = due_date
        invoice.po_reference = po_reference
        invoice.place_of_supply = "United States"
        invoice.company_id = company_id
        invoice.customer_id = customer_id
        invoice.payment_terms = "Net 30 days from invoice date."
        invoice.invoice_status = "Generated"
        invoice.items.clear()
        subtotal = 0.0
        tax = 0.0
        for line_no, (product_id, quantity) in enumerate(lines, 1):
            product = db.get(ProductCatalog, product_id)
            amount = round(product.rate * quantity, 2)
            line_tax = round(amount * product.gst_percentage / 100, 2)
            subtotal += amount
            tax += line_tax
            invoice.items.append(InvoiceItem(
                product_id=product_id,
                description=product.product_name,
                hsn_sac=product.hsn_sac,
                quantity=quantity,
                unit=product.unit,
                rate=product.rate,
                gst_percentage=product.gst_percentage,
                amount=amount,
            ))
        invoice.subtotal = round(subtotal, 2)
        invoice.taxable_amount = invoice.subtotal
        invoice.igst = round(tax, 2)
        invoice.cgst = 0
        invoice.sgst = 0
        invoice.round_off = round(round(invoice.subtotal + tax) - (invoice.subtotal + tax), 2)
        invoice.grand_total = round(invoice.subtotal + tax + invoice.round_off, 2)
        invoice.amount_in_words = "US Dollars demo amount only"
        db.add(invoice)
    db.commit()
