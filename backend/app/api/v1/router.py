from fastapi import APIRouter

from app.api.v1.endpoints import auth, bookings, availability, payments

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(bookings.router)
api_router.include_router(availability.router)
api_router.include_router(payments.router)
