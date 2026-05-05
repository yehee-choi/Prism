from fastapi import APIRouter
from app.services.dart_insight import get_dart_insight

router = APIRouter(prefix="/dart", tags=["dart"])

@router.get("/insight/{ticker}")
def dart_insight(ticker: str):
    """종목코드 → DART 공시 자동 요약"""
    return get_dart_insight(ticker)
