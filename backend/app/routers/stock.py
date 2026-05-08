import os
import requests

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


@router.get("/search")
def search_stock(q: str = Query(..., description="종목명 또는 종목코드 검색어")):
    query = q.strip()
    if not query:
        return []

    dart_api_key = os.getenv("DART_API_KEY")
    if not dart_api_key:
        return []

    try:
        resp = requests.get(
            "https://opendart.fss.or.kr/api/company.json",
            params={"crtfc_key": dart_api_key, "corp_name": query},
            timeout=10,
        )
        data = resp.json()

        if data.get("status") != "000":
            return []

        output = []
        for corp in data.get("results", []):
            stock_code = corp.get("stock_code", "").strip()
            if stock_code:
                output.append({"ticker": stock_code, "name": corp.get("corp_name", "")})
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