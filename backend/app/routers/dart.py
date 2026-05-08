from fastapi import APIRouter
from app.services.dart_insight import get_dart_insight, get_full_dart_data

router = APIRouter(prefix="/dart", tags=["dart"])


@router.get("/insight/{ticker}")
def dart_insight(ticker: str):
    """종목코드 → DART 공시 자동 요약 (기존 호환)"""
    return get_dart_insight(ticker)


@router.get("/full/{ticker}")
def dart_full(ticker: str):
    """종목코드 → 재무제표·대주주·임원·배당·주식발행 전체 수집"""
    return get_full_dart_data(ticker)
