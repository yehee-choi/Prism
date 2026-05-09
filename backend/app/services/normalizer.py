import pandas as pd
import re
from datetime import datetime

# 컬럼명 표준화 매핑 테이블 (Skills.md 3-1 기준)
COLUMN_MAP = {
    # 날짜
    "날짜": "date", "일자": "date", "기준일": "date", "Date": "date", "date": "date",
    # 종목
    "종목코드": "ticker", "Code": "ticker", "ticker": "ticker", "symbol": "ticker",
    "종목명": "name", "Name": "name", "name": "name", "종목": "name",
    # OHLCV
    "시가": "open", "Open": "open", "open": "open",
    "고가": "high", "High": "high", "high": "high",
    "저가": "low", "Low": "low", "low": "low",
    "종가": "close", "Close": "close", "현재가": "close", "close": "close",
    "거래량": "volume", "Volume": "volume", "vol": "volume", "volume": "volume",
    "거래대금": "amount", "Amount": "amount", "amount": "amount",
    "등락률": "return_pct", "수익률": "return_pct", "Return": "return_pct", "return": "return_pct",
    "시가총액": "market_cap", "Marcap": "market_cap", "MarketCap": "market_cap",
    # 수급
    "외국인순매수": "foreign_net", "외국인": "foreign_net", "foreign_net": "foreign_net",
    "기관순매수": "institution_net", "기관": "institution_net", "institution_net": "institution_net",
    "공매도잔고": "short_balance", "short_balance": "short_balance",
    # 재무제표
    "매출액": "revenue", "Revenue": "revenue", "Sales": "revenue",
    "매출액(억원)": "revenue", "매출액(백만원)": "revenue",
    "영업이익": "operating_income", "OperatingIncome": "operating_income", "OI": "operating_income",
    "영업이익(억원)": "operating_income", "영업이익(백만원)": "operating_income",
    "당기순이익": "net_income", "NetIncome": "net_income", "NI": "net_income",
    "당기순이익(억원)": "net_income", "당기순이익(백만원)": "net_income",
    "총자산": "total_asset", "TotalAsset": "total_asset",
    "총자산(억원)": "total_asset",
    "총부채": "total_debt", "TotalDebt": "total_debt",
    "총부채(억원)": "total_debt",
    "자기자본": "equity", "Equity": "equity",
    "자기자본(억원)": "equity",
    "유동자산": "current_asset", "CurrentAsset": "current_asset",
    "유동자산(억원)": "current_asset",
    "유동부채": "current_liability", "CurrentLiability": "current_liability",
    "유동부채(억원)": "current_liability",
    "이자비용": "interest_expense", "InterestExpense": "interest_expense",
    "이자비용(억원)": "interest_expense",
    "매출채권": "accounts_receivable", "AccountsReceivable": "accounts_receivable",
    "매출채권(억원)": "accounts_receivable",
    # 펀드
    "기준가": "nav", "NAV": "nav", "nav": "nav",
    "설정액": "aum", "AUM": "aum",
    "MDD": "mdd", "최대낙폭": "mdd",
    "샤프지수": "sharpe", "Sharpe": "sharpe", "sharpe": "sharpe",
    "편입비중": "weight", "비중": "weight", "Weight": "weight", "weight": "weight",
    "벤치마크": "benchmark", "BM": "benchmark", "benchmark": "benchmark",
}

def normalize_columns(df: pd.DataFrame) -> tuple[pd.DataFrame, list]:
    """컬럼명 표준화 — 매핑 안되는 컬럼은 원본 유지"""
    renamed = {}
    unmapped = []
    for col in df.columns:
        if col in COLUMN_MAP:
            renamed[col] = COLUMN_MAP[col]
        else:
            unmapped.append(col)
    df = df.rename(columns=renamed)
    return df, unmapped


def normalize_date(df: pd.DataFrame) -> pd.DataFrame:
    """날짜 컬럼을 YYYY-MM-DD 형식으로 통일"""
    if "date" not in df.columns:
        return df
    def parse_date(val):
        val = str(val).strip()
        # 8자리 숫자
        if re.match(r'^\d{8}$', val):
            return pd.to_datetime(val, format='%Y%m%d')
        # 한글 날짜
        m = re.match(r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일', val)
        if m:
            return pd.to_datetime(f"{m.group(1)}-{m.group(2)}-{m.group(3)}")
        # Excel 시리얼
        if re.match(r'^\d{5}$', val):
            return pd.to_datetime(int(val), unit='D', origin='1899-12-30')
        # 나머지 (슬래시, 하이픈 등)
        try:
            return pd.to_datetime(val)
        except:
            return pd.NaT
    before = len(df)
    df["date"] = df["date"].apply(parse_date)
    df = df.dropna(subset=["date"])
    df["date"] = df["date"].dt.strftime('%Y-%m-%d')
    removed = before - len(df)
    if removed > 0:
        print(f"[경고] 날짜 파싱 실패로 {removed}행 제거")
    return df


def normalize_units(df: pd.DataFrame) -> pd.DataFrame:
    """단위 정규화 — 억원/백만원 → 원, 수익률 % → 소수점"""
    for col in df.columns:
        col_lower = col.lower()
        if "(억원)" in col or "_억" in col_lower:
            df[col] = pd.to_numeric(df[col], errors='coerce') * 100_000_000
        elif "(백만원)" in col or "_백만" in col_lower:
            df[col] = pd.to_numeric(df[col], errors='coerce') * 1_000_000
        elif "(천원)" in col:
            df[col] = pd.to_numeric(df[col], errors='coerce') * 1_000
    # 수익률 소수점 변환
    if "return_pct" in df.columns:
        df["return_pct"] = pd.to_numeric(df["return_pct"], errors='coerce')
        mask = df["return_pct"].abs() > 1
        df.loc[mask, "return_pct"] = df.loc[mask, "return_pct"] / 100
    return df


def normalize_missing(df: pd.DataFrame) -> pd.DataFrame:
    """결측값 처리 (Skills.md 3-4 기준)"""
    ohlc = [c for c in ["open", "high", "low", "close"] if c in df.columns]
    if ohlc:
        df[ohlc] = df[ohlc].ffill()
    if "volume" in df.columns:
        df["volume"] = df["volume"].fillna(0)
    if "weight" in df.columns:
        total = df["weight"].sum()
        if total > 0:
            df["weight"] = df["weight"] / total * 100
    return df


def run_normalization(df: pd.DataFrame) -> dict:
    """전체 정규화 파이프라인 실행"""
    df = normalize_units(df)               # ← 순서 변경: 단위 먼저
    df, unmapped = normalize_columns(df)   # ← 그 다음 rename
    df = normalize_date(df)
    df = normalize_missing(df)
    return {"df": df, "unmapped_columns": unmapped}
