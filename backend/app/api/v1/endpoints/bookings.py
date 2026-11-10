from typing import Optional
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.db.models import User, Booking
from app.schemas.booking import BookingCreate, BookingOut
from app.services.booking import create_booking, list_bookings, get_booking

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=201)
def create_booking_endpoint(
    body: BookingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("super_admin")),
):
    try:
        return create_booking(db, body, user.id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=409, detail={"code": "BOOKING_CONFLICT", "message": str(e)})


@router.get("", response_model=dict)
def list_bookings_endpoint(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("super_admin")),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    event_date: Optional[date] = Query(None),
    slot: Optional[str] = Query(None, pattern="^(day|night)$"),
):
    rows, total = list_bookings(db, skip, limit, search, status, event_date, slot)
    return {
        "success": True,
        "data": {
            "items": rows,
            "total": total,
            "page": skip // max(limit, 1) + 1,
            "page_size": limit,
        },
    }


@router.get("/{booking_id}", response_model=dict)
def get_booking_endpoint(
    booking_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("super_admin")),
):
    b = get_booking(db, booking_id)
    if not b:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Booking not found"})
    return {"success": True, "data": b}
