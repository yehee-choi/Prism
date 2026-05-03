import pandas as pd
import numpy as np
from typing import Optional

RISK_FREE_RATE = 0.035  # 한국 3년 국채 기본값


# ── 1. 수익률 ─────────────────────────────────────
def calc_returns(df: pd.DataFrame) -> dict:
    """수익률 계산 (단순·누적·CAGR)"""
    if "close" not in df.columns:
        return {}
    close = pd.to_numeric(df["close"], errors="coerce").dropna()
    if len(close) < 2:
        return {}

    simple_return = (close.iloc[-1] - close.iloc[0]) / close.iloc[0]
    daily_returns = close.pct_change().dropna()
    cumulative = (1 + daily_returns).prod() - 1
    years = len(close) / 252
    cagr = (close.iloc[-1] / close.iloc[0]) ** (1 / years) - 1 if years > 0 else 0

    return {
        "simple_return": round(float(simple_return), 4),
        "cumulative_return": round(float(cumulative), 4),
        "cagr": round(float(cagr), 4),
        "daily_returns": daily_returns.tolist(),
    }


# ── 2. 위험 지표 ──────────────────────────────────
def calc_risk(df: pd.DataFrame) -> dict:
    """MDD · 변동성 · VaR 계산"""
    if "close" not in df.columns:
        return {}
    close = pd.to_numeric(df["close"], errors="coerce").dropna()
    if len(close) < 2:
        return {}

    daily_returns = close.pct_change().dropna()

    # 변동성 (연율화)
    volatility = float(daily_returns.std() * np.sqrt(252))

    # MDD
    cumulative = (1 + daily_returns).cumprod()
    rolling_max = cumulative.cummax()
    drawdown = (cumulative - rolling_max) / rolling_max
    mdd = float(drawdown.min())

    # VaR (95%)
    var_95 = float(np.percentile(daily_returns, 5))

    return {
        "volatility": round(volatility, 4),
        "mdd": round(mdd, 4),
        "var_95": round(var_95, 4),
    }


# ── 3. 위험조정 수익률 ────────────────────────────
def calc_risk_adjusted(df: pd.DataFrame) -> dict:
    """샤프지수 · 정보비율 계산"""
    if "close" not in df.columns:
        return {}
    close = pd.to_numeric(df["close"], errors="coerce").dropna()
    if len(close) < 2:
        return {}

    daily_returns = close.pct_change().dropna()
    ann_return = float((1 + daily_returns.mean()) ** 252 - 1)
    ann_vol = float(daily_returns.std() * np.sqrt(252))

    sharpe = (ann_return - RISK_FREE_RATE) / ann_vol if ann_vol > 0 else 0

    return {
        "sharpe": round(sharpe, 4),
        "ann_return": round(ann_return, 4),
        "ann_volatility": round(ann_vol, 4),
    }


# ── 4. 밸류에이션 ─────────────────────────────────
def calc_valuation(df: pd.DataFrame) -> dict:
    """PER · PBR · ROE · 영업이익률 · 부채비율"""
    result = {}
    cols = df.columns.tolist()

    def get(col):
        if col in cols:
            val = pd.to_numeric(df[col], errors="coerce")
            return float(val.iloc[-1]) if not val.empty else None
        return None

    revenue = get("revenue")
    op_income = get("operating_income")
    net_income = get("net_income")
    equity = get("equity")
    total_debt = get("total_debt")

    if revenue and op_income:
        result["operating_margin"] = round(op_income / revenue * 100, 2)
    if net_income and equity and equity != 0:
        result["roe"] = round(net_income / equity * 100, 2)
    if total_debt and equity and equity != 0:
        result["debt_ratio"] = round(total_debt / equity * 100, 2)

    return result


# ── 5. 신용 위험 (회계/재무담당) ──────────────────
def calc_credit_risk(df: pd.DataFrame) -> dict:
    """유동비율 · 이자보상배율 · DSO"""
    result = {}
    warnings = []
    cols = df.columns.tolist()

    def get_last(col):
        if col in cols:
            val = pd.to_numeric(df[col], errors="coerce").dropna()
            return float(val.iloc[-1]) if not val.empty else None
        return None

    current_asset = get_last("current_asset")
    current_liability = get_last("current_liability")
    op_income = get_last("operating_income")
    interest_expense = get_last("interest_expense")
    accounts_receivable = get_last("accounts_receivable")
    revenue = get_last("revenue")

    # 유동비율
    if current_asset and current_liability and current_liability != 0:
        current_ratio = current_asset / current_liability * 100
        result["current_ratio"] = round(current_ratio, 2)
        if current_ratio < 100:
            warnings.append("유동비율 100% 미만 — 유동성 위험")

    # 이자보상배율
    if op_income and interest_expense and interest_expense != 0:
        interest_coverage = op_income / interest_expense
        result["interest_coverage"] = round(interest_coverage, 2)
        if interest_coverage < 1:
            warnings.append("이자보상배율 1 미만 — 이자 미충당 위험")

    # DSO
    if accounts_receivable and revenue and revenue != 0:
        dso = accounts_receivable / (revenue / 365)
        result["dso"] = round(dso, 1)
        if dso > 75:
            warnings.append(f"DSO {dso:.1f}일 — 매출채권 회수 지연 (기준 75일)")

    result["warnings"] = warnings
    return result


# ── 6. 직군별 통합 계산 ───────────────────────────
def calculate_by_role(df: pd.DataFrame, role: str) -> dict:
    """직군에 따라 필요한 지표만 계산"""
    if role == "stock":
        return {
            "returns": calc_returns(df),
            "risk": calc_risk(df),
            "risk_adjusted": calc_risk_adjusted(df),
        }
    elif role == "fund":
        return {
            "returns": calc_returns(df),
            "risk": calc_risk(df),
            "risk_adjusted": calc_risk_adjusted(df),
        }
    elif role == "financial":
        return {
            "valuation": calc_valuation(df),
            "credit_risk": calc_credit_risk(df),
        }
    elif role == "analyst":
        return {
            "returns": calc_returns(df),
            "valuation": calc_valuation(df),
            "risk": calc_risk(df),
        }
    else:
        return {
            "returns": calc_returns(df),
            "risk": calc_risk(df),
        }
