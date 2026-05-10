from typing import Optional
import os
import pandas as pd
from pykrx import stock
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

DART_API_KEY = os.getenv("DART_API_KEY")


def _get_dart():
    import dart_fss as dart
    dart.set_api_key(DART_API_KEY)
    return dart


def _safe_end_date() -> str:
    now = datetime.now()
    cutoff = now.replace(hour=16, minute=30, second=0, microsecond=0)
    if now < cutoff:
        target = now - timedelta(days=1)
    else:
        target = now

    weekday = target.weekday()
    if weekday == 5:
        target -= timedelta(days=1)
    elif weekday == 6:
        target -= timedelta(days=2)

    return target.strftime("%Y%m%d")


def get_stock_ohlcv(ticker: str, start: str, end: str) -> dict:
    try:
        df = stock.get_market_ohlcv(start, end, ticker)

        retry = 0
        while df.empty and retry < 3:
            retry += 1
            end_dt = datetime.strptime(end, "%Y%m%d") - timedelta(days=retry)
            while end_dt.weekday() >= 5:
                end_dt -= timedelta(days=1)
            end = end_dt.strftime("%Y%m%d")
            df = stock.get_market_ohlcv(start, end, ticker)

        if df.empty:
            return {"success": False, "error": "데이터 없음 (KRX 미제공 기간)"}

        df = df.reset_index()
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


def get_stock_investor(ticker: str, start: str, end: str) -> dict:
    try:
        df = stock.get_market_net_purchases_of_equities(start, end, ticker)

        retry = 0
        while df.empty and retry < 3:
            retry += 1
            end_dt = datetime.strptime(end, "%Y%m%d") - timedelta(days=retry)
            while end_dt.weekday() >= 5:
                end_dt -= timedelta(days=1)
            end = end_dt.strftime("%Y%m%d")
            df = stock.get_market_net_purchases_of_equities(start, end, ticker)

        if df.empty:
            return {"success": False, "error": "수급 데이터 없음"}

        df = df.reset_index()
        df.columns = [str(c) for c in df.columns]

        # ── 수급 컬럼명 방어 매핑 ──
        # pykrx 버전에 따라 컬럼명이 다를 수 있어서 후보를 모두 처리
        col_map = {
            # 날짜
            "날짜": "date",
            # 외국인
            "외국인합계": "foreign_net",
            "외국인": "foreign_net",
            "외국인_합계": "foreign_net",
            # 기관
            "기관합계": "institution_net",
            "기관": "institution_net",
            "기관_합계": "institution_net",
            # 개인
            "개인": "individual_net",
        }
        df = df.rename(columns=col_map)

        # 매핑 후에도 없으면 컬럼 목록에서 위치로 찾기 (fallback)
        cols = list(df.columns)
        if "foreign_net" not in cols:
            # 보통 외국인이 첫 번째 순매수 컬럼
            non_date = [c for c in cols if c != "date" and c != "ticker"]
            if len(non_date) >= 1:
                df = df.rename(columns={non_date[0]: "foreign_net"})
        if "institution_net" not in cols:
            non_date = [c for c in df.columns if c not in ("date", "ticker", "foreign_net", "individual_net")]
            if len(non_date) >= 1:
                df = df.rename(columns={non_date[0]: "institution_net"})

        if "date" in df.columns:
            df["date"] = df["date"].astype(str)

        # 실제 수급 데이터가 전부 0인지 확인해서 로그
        if "foreign_net" in df.columns and "institution_net" in df.columns:
            total = df["foreign_net"].abs().sum() + df["institution_net"].abs().sum()
            if total == 0:
                return {"success": False, "error": "수급 데이터가 모두 0 (해당 종목 수급 미제공)"}

        return {"success": True, "data": df.to_dict(orient="records")}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_short_balance(ticker: str, start: str, end: str) -> dict:
    try:
        df = stock.get_shorting_balance_by_date(start, end, ticker)

        retry = 0
        while df.empty and retry < 3:
            retry += 1
            end_dt = datetime.strptime(end, "%Y%m%d") - timedelta(days=retry)
            while end_dt.weekday() >= 5:
                end_dt -= timedelta(days=1)
            end = end_dt.strftime("%Y%m%d")
            df = stock.get_shorting_balance_by_date(start, end, ticker)

        if df.empty:
            return {"success": False, "error": "공매도 데이터 없음"}

        df = df.reset_index()
        df.columns = [str(c) for c in df.columns]
        if "date" in df.columns:
            df["date"] = df["date"].astype(str)
        return {"success": True, "data": df.to_dict(orient="records")}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_financial_statements(corp_code: str, year: str) -> dict:
    try:
        dart = _get_dart()
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


PE_KEYWORDS = ["인베스트먼트", "파트너스", "사모", "PEF", "펀드", "PE", "캐피탈"]

def get_major_shareholders(corp_code: str) -> dict:
    try:
        dart = _get_dart()
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


def ticker_to_corp_code(ticker: str) -> str:
    try:
        dart = _get_dart()
        corp_list = dart.get_corp_list()
        corp = corp_list.find_by_stock_code(ticker)
        if corp:
            return corp.corp_code
        return None
    except:
        return None


def collect_all(ticker: str, period_days: int = 365) -> dict:
    end = _safe_end_date()
    start = (datetime.strptime(end, "%Y%m%d") - timedelta(days=period_days)).strftime("%Y%m%d")
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

def get_kospi_returns(start: str, end: str) -> list:
    try:
        df = stock.get_index_ohlcv(start, end, "1001")
        print(f"[코스피] shape={df.shape}, empty={df.empty}")
        if df.empty:
            return []
        print(f"[코스피 컬럼] {df.columns.tolist()}")
        return df["종가"].pct_change().dropna().tolist()
    except Exception as e:
        print(f"[코스피 수익률 오류] {e}")
        return []