from fastapi import APIRouter, Query
from dotenv import load_dotenv

load_dotenv()

from app.services.corp_cache import search_by_name, cache_info
from app.services.collector import (
    collect_all,
    get_stock_ohlcv,
    get_stock_investor,
    get_short_balance,
)

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("/search")
def search_stock(q: str = Query(..., description="종목명 또는 종목코드 검색어")):
    query = q.strip()
    if not query:
        return []
    return search_by_name(query)


@router.get("/search/debug")
def search_debug():
    return cache_info()


@router.get("/collect/{ticker}")
def collect_stock(
    ticker: str,
    period_days: int = Query(default=365, description="수집 기간 (일)"),
    role: str = Query(default="stock", description="직군: stock / financial / fund / analyst"),
):
    return collect_all(ticker, period_days)


@router.get("/ohlcv/{ticker}")
def get_ohlcv(ticker: str, start: str = "20240101", end: str = "20241231"):
    return get_stock_ohlcv(ticker, start, end)


@router.get("/investor/{ticker}")
def get_investor(ticker: str, start: str = "20240101", end: str = "20241231"):
    return get_stock_investor(ticker, start, end)


@router.get("/short/{ticker}")
def get_short(ticker: str, start: str = "20240101", end: str = "20241231"):
    return get_short_balance(ticker, start, end)
