import os
import threading
import zipfile
import requests

from io import BytesIO
from xml.etree import ElementTree as ET
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

# In-memory cache built from DART corpCode.xml (accessible globally, unlike KRX)
_name_to_ticker: dict = {}   # corp_name -> stock_code
_ticker_to_name: dict = {}   # stock_code -> corp_name
_cache_loaded = False
_cache_lock = threading.Lock()
_cache_error: str = ""


def _load_corp_cache():
    global _name_to_ticker, _ticker_to_name, _cache_loaded, _cache_error

    if _cache_loaded:
        return

    with _cache_lock:
        if _cache_loaded:
            return

        dart_api_key = os.getenv("DART_API_KEY")
        if not dart_api_key:
            _cache_error = "DART_API_KEY not set"
            return

        try:
            resp = requests.get(
                "https://opendart.fss.or.kr/api/corpCode.xml",
                params={"crtfc_key": dart_api_key},
                timeout=30,
            )
            resp.raise_for_status()

            with zipfile.ZipFile(BytesIO(resp.content)) as zf:
                xml_bytes = zf.read("CORPCODE.xml")

            root = ET.fromstring(xml_bytes)
            n2t: dict = {}
            t2n: dict = {}
            for corp in root.findall("list"):
                stock_code = (corp.findtext("stock_code") or "").strip()
                corp_name = (corp.findtext("corp_name") or "").strip()
                if stock_code and corp_name:
                    n2t[corp_name] = stock_code
                    t2n[stock_code] = corp_name

            _name_to_ticker = n2t
            _ticker_to_name = t2n
            _cache_loaded = True
            _cache_error = ""

        except Exception as e:
            _cache_error = str(e)


# Pre-load cache in background when the module is imported
threading.Thread(target=_load_corp_cache, daemon=True).start()


@router.get("/search")
def search_stock(q: str = Query(..., description="종목명 또는 종목코드 검색어")):
    query = q.strip()
    if not query:
        return []

    _load_corp_cache()

    if not _cache_loaded:
        return []

    # Exact ticker code hit
    if query in _ticker_to_name:
        return [{"ticker": query, "name": _ticker_to_name[query]}]

    # Partial company name search
    results = []
    for name, ticker in _name_to_ticker.items():
        if query in name:
            results.append({"ticker": ticker, "name": name})
            if len(results) >= 10:
                break
    return results


@router.get("/search/debug")
def search_debug():
    """배포 환경에서 캐시 상태 확인용"""
    return {
        "cache_loaded": _cache_loaded,
        "cache_error": _cache_error,
        "total_companies": len(_name_to_ticker),
        "sample": list(_name_to_ticker.items())[:5],
    }


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
