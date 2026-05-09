import os
import threading
import zipfile
import requests
from io import BytesIO
from xml.etree import ElementTree as ET

_name_to_ticker: dict = {}
_ticker_to_name: dict = {}
_ticker_to_corp: dict = {}   # stock_code -> corp_code (DART 고유번호)
_name_to_corp: dict = {}  
_cache_loaded = False
_cache_lock = threading.Lock()
_cache_error: str = ""


def load_corp_cache():
    global _name_to_ticker, _ticker_to_name, _ticker_to_corp
    global _cache_loaded, _cache_error
    global _name_to_ticker, _ticker_to_name, _ticker_to_corp, _name_to_corp

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
            n2t, t2n, t2c = {}, {}, {}
            for corp in root.findall("list"):
                stock_code = (corp.findtext("stock_code") or "").strip()
                corp_name = (corp.findtext("corp_name") or "").strip()
                corp_code = (corp.findtext("corp_code") or "").strip()
                if corp_name and corp_code:
                    _name_to_corp[corp_name] = corp_code  # 이름 → corp_code 직접 매핑
                    if stock_code:
                        n2t[corp_name] = stock_code
                        t2n[stock_code] = corp_name
                        t2c[stock_code] = corp_code


            _name_to_ticker = n2t
            _ticker_to_name = t2n
            _ticker_to_corp = t2c
            _cache_loaded = True
            _cache_error = ""

        except Exception as e:
            _cache_error = str(e)


def get_corp_code(ticker: str):
    load_corp_cache()
    return _ticker_to_corp.get(ticker)


def get_corp_name(ticker: str):
    load_corp_cache()
    return _ticker_to_name.get(ticker)


def search_by_name(query: str, limit: int = 10) -> list:
    load_corp_cache()
    results = []
    for name, ticker in _name_to_ticker.items():
        if query in name or query == ticker:
            results.append({"ticker": ticker, "name": name})
            if len(results) >= limit:
                break
    return results


def cache_info() -> dict:
    return {
        "loaded": _cache_loaded,
        "error": _cache_error,
        "total": len(_name_to_ticker),
    }
    
from typing import Optional
def get_corp_code_by_name(name: str) -> Optional[str]:
    load_corp_cache()
    return _name_to_corp.get(name)


# Background preload on import
threading.Thread(target=load_corp_cache, daemon=True).start()
