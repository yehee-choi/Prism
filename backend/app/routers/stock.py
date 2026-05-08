import os
import threading
import requests

from fastapi import APIRouter, Query
from dotenv import load_dotenv
from datetime import datetime, timedelta
from pykrx import stock as pykrx_stock

load_dotenv()

from app.services.collector import (
    collect_all,
    get_stock_ohlcv,
    get_stock_investor,
    get_short_balance,
)

router = APIRouter(prefix="/stock", tags=["stock"])

# In-memory cache: ticker -> name
_ticker_name_map: dict = {}
_cache_date: str = ""
_cache_lock = threading.Lock()


def _get_ticker_name_map() -> dict:
    global _ticker_name_map, _cache_date

    today = datetime.today()
    while today.weekday() >= 5:  # skip weekends
        today -= timedelta(days=1)
    date_str = today.strftime("%Y%m%d")

    if _cache_date == date_str and _ticker_name_map:
        return _ticker_name_map

    with _cache_lock:
        if _cache_date == date_str and _ticker_name_map:
            return _ticker_name_map

        new_map: dict = {}
        for market in ["KOSPI", "KOSDAQ"]:
            tickers = pykrx_stock.get_market_ticker_list(date_str, market=market)
            for ticker in tickers:
                name = pykrx_stock.get_market_ticker_name(ticker)
                new_map[ticker] = name

        _ticker_name_map = new_map
        _cache_date = date_str

    return _ticker_name_map


@router.get("/search")
def search_stock(q: str = Query(..., description="종목명 또는 종목코드 검색어")):
    query = q.strip()
    if not query:
        return []

    try:
        ticker_map = _get_ticker_name_map()
        results = []
        for ticker, name in ticker_map.items():
            if query in name or query == ticker:
                results.append({"ticker": ticker, "name": name})
                if len(results) >= 10:
                    break
        return results
    except Exception:
        return []


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