from typing import Optional
import os
import dart_fss as dart
import pandas as pd
from pykrx import stock
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DART_API_KEY = os.getenv("DART_API_KEY")
dart.set_api_key(DART_API_KEY)


# ── 1. 주식 시세 (pykrx) ─────────────────────────
def get_stock_ohlcv(ticker: str, start: str, end: str) -> dict:
    try:
        df = stock.get_market_ohlcv(start, end, ticker)
        df = df.reset_index()
        # 실제 컬럼명 그대로 사용 후 rename
        df.columns = [str(c) for c in df.columns]
        col_map = {
            "날짜": "date", "시가": "open", "고가": "high",
            "저가": "low", "종가": "close", "거래량": "volume",
            "거래대금": "amount", "등락률": "return_pct"
        }
        df = df.rename(columns=col_map)
        if "date" in df.columns:
            df["date"] = df["date"].astype(str)
        df["ticker"] = ticker
        return {"success": True, "data": df.to_dict(orient="records")}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── 2. 수급 데이터 (pykrx) ───────────────────────
def get_stock_investor(ticker: str, start: str, end: str) -> dict:
    try:
        df = stock.get_market_net_purchases_of_equities(start, end, ticker)
        df = df.reset_index()
        df.columns = [str(c) for c in df.columns]
        col_map = {
            "날짜": "date", "외국인합계": "foreign_net",
            "기관합계": "institution_net", "개인": "individual_net"
        }
        df = df.rename(columns=col_map)
        if "date" in df.columns:
            df["date"] = df["date"].astype(str)
        return {"success": True, "data": df.to_dict(orient="records")}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── 3. 공매도 (pykrx) ────────────────────────────
def get_short_balance(ticker: str, start: str, end: str) -> dict:
    try:
        df = stock.get_shorting_balance_by_date(start, end, ticker)
        df = df.reset_index()
        df.columns = [str(c) for c in df.columns]
        if "date" in df.columns:
            df["date"] = df["date"].astype(str)
        return {"success": True, "data": df.to_dict(orient="records")}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── 4. 재무제표 (dart-fss) ───────────────────────
def get_financial_statements(corp_code: str, year: str) -> dict:
    try:
        corp = dart.get_corp_info(corp_code)
        fs = corp.extract_fs(bgn_de=f"{year}0101")
        bs = fs["bs"].to_dataframe()
        is_ = fs["is"].to_dataframe()
        cf = fs["cf"].to_dataframe()
        return {
            "success": True,
            "balance_sheet": bs.to_dict(orient="records"),
            "income_statement": is_.to_dict(orient="records"),
            "cash_flow": cf.to_dict(orient="records"),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── 5. 대주주 공시 (DART) ────────────────────────
PE_KEYWORDS = ["인베스트먼트", "파트너스", "사모", "PEF", "펀드", "PE", "캐피탈"]

def get_major_shareholders(corp_code: str) -> dict:
    try:
        corp = dart.get_corp_info(corp_code)
        report = corp.majority_shareholder()
        if report is None:
            return {"success": False, "error": "대주주 정보 없음"}
        df = report.to_dataframe()
        is_pe = False
        pe_name = None
        for _, row in df.iterrows():
            name = str(row.get("nm", ""))
            if any(kw in name for kw in PE_KEYWORDS):
                is_pe = True
                pe_name = name
                break
        return {
            "success": True,
            "shareholders": df.to_dict(orient="records"),
            "is_pe_shareholder": is_pe,
            "pe_name": pe_name
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── 6. 종목코드 → corp_code 변환 ─────────────────
def ticker_to_corp_code(ticker: str) -> str:
    try:
        corp_list = dart.get_corp_list()
        corp = corp_list.find_by_stock_code(ticker)
        if corp:
            return corp[0].corp_code
        return None
    except:
        return None


# ── 7. 통합 수집 ──────────────────────────────────
def collect_all(ticker: str, period_days: int = 365) -> dict:
    end = datetime.today().strftime("%Y%m%d")
    start = (datetime.today() - timedelta(days=period_days)).strftime("%Y%m%d")
    year = str(datetime.today().year - 1)

    result = {
        "ticker": ticker,
        "period": {"start": start, "end": end},
        "ohlcv": get_stock_ohlcv(ticker, start, end),
        "investor": get_stock_investor(ticker, start, end),
        "short": get_short_balance(ticker, start, end),
    }

    corp_code = ticker_to_corp_code(ticker)
    if corp_code:
        result["corp_code"] = corp_code
        result["financial"] = get_financial_statements(corp_code, year)
        result["shareholders"] = get_major_shareholders(corp_code)
    else:
        result["corp_code"] = None
        result["financial"] = {"success": False, "error": "corp_code 변환 실패"}
        result["shareholders"] = {"success": False, "error": "corp_code 변환 실패"}

    return result
