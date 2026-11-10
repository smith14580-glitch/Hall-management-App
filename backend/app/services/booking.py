import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select, text, func
from sqlalchemy.orm import Session

from app.core.exceptions import conflict
from app.core.config import settings
from app.crud import booking as booking_crud
from app.db.models import Booking, Customer, Hall, ApplicationSetting, User


def _get_setting(db: Session, key: str, default: str) -> str:
    row = db.execute(select(ApplicationSetting).where(ApplicationSetting.key == key)).scalar_one_or_none()
    return row.value if row else default


def _next_booking_code(db: Session, event_date: date) -> str:
    year = event_date.year
    count = db.execute(
        select(func.count(Booking.id)).where(
            Booking.booking_code.like(f"MQ-{year}-%")
        )
    ).scalar() or 0
    return f"MQ-{year}-{count + 1:04d}"


def _hall_price(db: Session, hall_id: uuid.UUID, slot: str) -> Decimal:
    hall = db.get(Hall, hall_id)
    if not hall:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Hall not found"})
    return Decimal(str(hall.day_price if slot == "day" else hall.night_price))


def create_booking(db: Session, data, created_by: uuid.UUID) -> Booking:
    hall = db.get(Hall, data.hall_id)
    if not hall:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Hall not found"})

    # Conflict safeguard: lock any active booking for same hall/date/slot
    existing = db.execute(
        select(Booking.id)
        .where(
            Booking.hall_id == data.hall_id,
            Booking.event_date == data.event_date,
            Booking.slot == data.slot,
            Booking.status.in_(["pending", "confirmed"]),
        )
        .with_for_update()
    ).first()
    if existing:
        raise conflict("BOOKING_CONFLICT", "This date and slot are already booked.")

    # Snapshot price
    total_price = _hall_price(db, data.hall_id, data.slot)

    # Advance default
    advance_percent = Decimal(_get_setting(db, "default_advance_percent", "50"))
    advance_amount = data.advance_amount if data.advance_amount is not None else (total_price * advance_percent / 100)

    booking_code = _next_booking_code(db, data.event_date)

    booking = booking_crud.create_booking_row(
        db,
        booking_code=booking_code,
        customer_id=data.customer_id,
        hall_id=data.hall_id,
        event_type=data.event_type,
        event_date=data.event_date,
        slot=data.slot,
        guest_count=data.guest_count,
        tables_required=data.tables_required,
        special_instructions=data.special_instructions,
        total_price=total_price,
        advance_amount=advance_amount,
        amount_paid=Decimal("0"),
        balance_amount=total_price,
        payment_status="unpaid",
        status="pending",
        created_by=created_by,
    )
    db.commit()
    db.refresh(booking)
    return booking


def list_bookings(db, skip=0, limit=100, search=None, status=None, event_date=None, slot=None):
    return booking_crud.get_bookings(db, skip, limit, search, status, event_date, slot)


def get_booking(db: Session, booking_id: uuid.UUID):
    return booking_crud.get_booking(db, booking_id)
