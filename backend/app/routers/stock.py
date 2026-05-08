from functools import lru_cache

from fastapi import APIRouter, Query
from pykrx import stock

from app.services.collector import (
    collect_all,
    get_stock_ohlcv,
    get_stock_investor,
    get_short_balance,
)

router = APIRouter(prefix="/stock", tags=["stock"])


@lru_cache(maxsize=1)
def get_cached_stock_list():
    tickers = stock.get_market_ticker_list(market="ALL")
    return [
        {
            "ticker": ticker,
            "name": stock.get_market_ticker_name(ticker),
        }
        for ticker in tickers
    ]


@router.get("/search")
def search_stock(q: str = Query(..., description="종목명 또는 종목코드 검색어")):
    query = q.strip().lower()

    if not query:
        return []

    results = [
        item
        for item in get_cached_stock_list()
        if query in item["ticker"].lower()
        or query in item["name"].lower()
    ]

    return results[:10]


@router.get("/collect/{ticker}")
def collect_stock(
    ticker: str,
    period_days: int = Query(default=365, description="수집 기간 (일)"),
    role: str = Query(default="stock", description="직군: stock / financial / fund / analyst"),
):
    """종목코드 입력 → 전체 데이터 자동 수집"""
    return collect_all(ticker, period_days)


@router.get("/ohlcv/{ticker}")
def get_ohlcv(ticker: str, start: str = "20240101", end: str = "20241231"):
    """주식 시세만 수집"""
    return get_stock_ohlcv(ticker, start, end)


@router.get("/investor/{ticker}")
def get_investor(ticker: str, start: str = "20240101", end: str = "20241231"):
    """수급 데이터만 수집"""
    return get_stock_investor(ticker, start, end)


@router.get("/short/{ticker}")
def get_short(ticker: str, start: str = "20240101", end: str = "20241231"):
    """공매도 잔고만 수집"""
    return get_short_balance(ticker, start, end)