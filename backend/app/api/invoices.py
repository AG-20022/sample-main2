from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.app.api.demo_auth import get_demo_dashboard_context
from backend.app.db.database import get_db
from backend.app.db.models import User
from backend.app.schemas.fedex import InvoiceCreate
from backend.app.services.invoice_service import create_invoice, list_invoices
from backend.app.services.fedex_demo_service import get_invoice as get_fedex_invoice, save_invoice as save_fedex_invoice, serialize_invoice as serialize_fedex_invoice
from backend.app.db.fedex_models import InvoiceMaster


router = APIRouter(prefix="/api/invoices", tags=["invoices"])


class CreateInvoiceRequest(BaseModel):
    order_id: str = Field(min_length=1, max_length=80)


class InvoiceCreatedResponse(BaseModel):
    orderId: str
    poNumber: str
    invoiceNumber: str
    status: Literal["Invoice Created"]
    validationStatus: Literal["PASSED"]
    poCreated: bool


class InvoiceValidationErrorResponse(BaseModel):
    status: Literal["FAILED", "VALIDATION_FAILED"]
    errors: list[str]


class InvoiceHistoryItem(BaseModel):
    invoiceNumber: str
    poNumber: str
    status: Literal["Invoice Created"]
    validationStatus: Literal["PASSED"]
    createdAt: str


class InvoiceHistoryResponse(BaseModel):
    orderId: str
    invoices: list[InvoiceHistoryItem]


@router.post("")
def create_order_invoice(
    request: dict,
    context: tuple[User, dict[str, str]] = Depends(get_demo_dashboard_context),
    db: Session = Depends(get_db),
) -> Any:
    if "invoice_number" in request:
        return serialize_fedex_invoice(save_fedex_invoice(db, InvoiceCreate.model_validate(request)))
    _, assignment = context
    if assignment["persona_id"] != "role-07":
        raise HTTPException(status_code=403, detail="Invoice creation is available to CC Manager only")
    parsed = CreateInvoiceRequest.model_validate(request)
    return create_invoice(parsed.order_id)


@router.get("")
def get_invoice_history(
    order_id: str | None = Query(default=None, min_length=1, max_length=80),
    context: tuple[User, dict[str, str]] = Depends(get_demo_dashboard_context),
    db: Session = Depends(get_db),
) -> Any:
    if not order_id:
        invoices = db.scalars(select(InvoiceMaster).options(joinedload(InvoiceMaster.line_items)).order_by(InvoiceMaster.created_date.desc())).unique().all()
        return [serialize_fedex_invoice(item) for item in invoices]
    _, assignment = context
    if assignment["persona_id"] != "role-07":
        raise HTTPException(status_code=403, detail="Invoice history is available to CC Manager only")
    return list_invoices(order_id)