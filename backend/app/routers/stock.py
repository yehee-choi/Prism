import os
from functools import lru_cache

from fastapi import APIRouter, Query
from dotenv import load_dotenv

load_dotenv()

from app.services.collector import (
    collect_all,
    get_stock_ohlcv,
    get_stock_investor,
    get_short_balance,
)

router = APIRouter(prefix="/stock", tags=["stock"])


@lru_cache(maxsize=1)
def get_dart_corp_list():
    import dart_fss as dart
    dart.set_api_key(os.getenv("DART_API_KEY"))
    return dart.get_corp_list()


@router.get("/search")
def search_stock(q: str = Query(..., description="종목명 또는 종목코드 검색어")):
    query = q.strip()
    if not query:
        return []

    try:
        corp_list = get_dart_corp_list()

        # 종목코드로 검색 (숫자 6자리인 경우)
        if query.isdigit() and len(query) == 6:
            corp = corp_list.find_by_stock_code(query)
            if corp and corp.stock_code:
                return [{"ticker": corp.stock_code, "name": corp.corp_name}]
            return []

        # 회사명으로 검색
        results = corp_list.find_by_corp_name(query, exactly=False)
        output = []
        for corp in results:
            if corp.stock_code:
                output.append({"ticker": corp.stock_code, "name": corp.corp_name})
            if len(output) >= 10:
                break
        return output

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