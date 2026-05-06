import pandas as pd
import numpy as np
from typing import Optional

RISK_FREE_RATE = 0.035  # 한국 3년 국채 기본값

SECTOR_PER_BENCHMARK = {
    "반도체·IT": {"per_low": 20, "per_high": 30},
    "금융·은행": {"per_low": 6, "per_high": 10},
    "제조·중공업": {"per_low": 8, "per_high": 15},
    "유통·소비재": {"per_low": 12, "per_high": 18},
    "바이오·헬스케어": {"per_low": 30, "per_high": 50},
    "건설·부동산": {"per_low": 6, "per_high": 12},
    "기타": {"per_low": 12, "per_high": 15},
}

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
    

    # VaR (95%)
    var_95 = float(np.percentile(daily_returns, 5))

    #칼마 비율
    cumulative = (1 + daily_returns).cumprod()
    rolling_max = cumulative.cummax()
    drawdown = (cumulative - rolling_max) / rolling_max
    mdd = abs(float(drawdown.min()))
    years = len(close) / 252
    cagr = (close.iloc[-1] / close.iloc[0]) ** (1 / years) - 1 if years > 0 else 0
    calmar = round(float(cagr) / mdd, 4) if mdd > 0 else 0
    
    return {
        "volatility": round(volatility, 4),
        "mdd": round(mdd, 4),      # 칼마 계산 후 mdd가 abs값으로 바뀐 상태
        "var_95": round(var_95, 4),
        "calmar": calmar,
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

    # EV/EBITDA
    total_debt = get("total_debt")
    market_cap = get("market_cap")
    if op_income and market_cap and total_debt:
        ebitda = op_income  # 감가상각비 없을 시 영업이익으로 대체
        ev = market_cap + total_debt
        if ebitda > 0:
            result["ev_ebitda"] = round(ev / ebitda, 2)

    # PSR
    if revenue and market_cap and revenue > 0:
        result["psr"] = round(market_cap / revenue, 2)

    # 업종 PER 벤치마크
    sector = "기타"
    benchmark = SECTOR_PER_BENCHMARK.get(sector, SECTOR_PER_BENCHMARK["기타"])
    result["per_benchmark"] = benchmark
    
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

def calc_cashflow(df: pd.DataFrame) -> dict:
    """OCF · FCF · DPO · CCC 계산"""
    result = {}
    warnings = []
    cols = df.columns.tolist()

    def get_last(col):
        if col in cols:
            val = pd.to_numeric(df[col], errors="coerce").dropna()
            return float(val.iloc[-1]) if not val.empty else None
        return None

    net_income = get_last("net_income")
    op_income = get_last("operating_income")
    revenue = get_last("revenue")
    accounts_receivable = get_last("accounts_receivable")
    inventory = get_last("inventory")
    accounts_payable = get_last("accounts_payable")
    cost_of_goods = get_last("cost_of_goods")

    # OCF (감가상각 없을 시 영업이익 근사)
    if net_income and op_income:
        ocf = net_income + (op_income - net_income) * 0.1  # 근사값
        result["ocf"] = round(ocf, 0)
        if ocf < 0 and op_income > 0:
            warnings.append("OCF 음수 + 영업이익 양수 — 흑자도산 위험 신호")

    # DPO
    if accounts_payable and cost_of_goods and cost_of_goods > 0:
        dpo = accounts_payable / (cost_of_goods / 365)
        result["dpo"] = round(dpo, 1)

    # DSO (중복 계산이지만 CCC 위해 필요)
    dso = None
    if accounts_receivable and revenue and revenue > 0:
        dso = accounts_receivable / (revenue / 365)

    # 재고회전일수
    dio = None
    if inventory and cost_of_goods and cost_of_goods > 0:
        dio = inventory / (cost_of_goods / 365)
        result["dio"] = round(dio, 1)

    # CCC
    if dso and dio and "dpo" in result:
        ccc = dso + dio - result["dpo"]
        result["ccc"] = round(ccc, 1)
        if ccc > 90:
            warnings.append(f"CCC {ccc:.1f}일 — 운전자본 부담 경고 (기준 90일)")

    result["warnings"] = warnings
    return result

def calc_technical(df: pd.DataFrame) -> dict:
    """RSI · 이동평균선 · 골든/데드크로스"""
    if "close" not in df.columns:
        return {}
    close = pd.to_numeric(df["close"], errors="coerce").dropna()
    if len(close) < 20:
        return {}

    result = {}

    # RSI(14)
    delta = close.diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    avg_gain = gain.rolling(14).mean()
    avg_loss = loss.rolling(14).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    rsi_val = float(rsi.iloc[-1]) if not pd.isna(rsi.iloc[-1]) else None
    result["rsi"] = round(rsi_val, 2) if rsi_val else None
    result["rsi_signal"] = "과매수" if rsi_val and rsi_val > 70 else ("과매도" if rsi_val and rsi_val < 30 else "중립")

    # 이동평균선
    for n in [5, 20, 60, 120]:
        if len(close) >= n:
            result[f"ma{n}"] = round(float(close.rolling(n).mean().iloc[-1]), 2)

    # 골든/데드크로스
    if "ma5" in result and "ma20" in result:
        ma5 = close.rolling(5).mean()
        ma20 = close.rolling(20).mean()
        prev_diff = float(ma5.iloc[-2]) - float(ma20.iloc[-2])
        curr_diff = float(ma5.iloc[-1]) - float(ma20.iloc[-1])
        if prev_diff < 0 and curr_diff >= 0:
            result["cross_signal"] = "골든크로스"
        elif prev_diff > 0 and curr_diff <= 0:
            result["cross_signal"] = "데드크로스"
        else:
            result["cross_signal"] = "없음"

    return result


def calc_portfolio_risk(df: pd.DataFrame, bm_returns: list = None) -> dict:
    """베타 · Tracking Error (펀드매니저)"""
    if "close" not in df.columns:
        return {}
    close = pd.to_numeric(df["close"], errors="coerce").dropna()
    if len(close) < 20:
        return {}

    result = {}
    daily_returns = close.pct_change().dropna()

    if bm_returns and len(bm_returns) == len(daily_returns):
        bm = pd.Series(bm_returns)
        # 베타
        cov = np.cov(daily_returns, bm)[0][1]
        bm_var = np.var(bm)
        beta = cov / bm_var if bm_var > 0 else 1.0
        result["beta"] = round(float(beta), 4)

        # Tracking Error
        excess = daily_returns.values - bm.values
        tracking_error = float(np.std(excess) * np.sqrt(252))
        result["tracking_error"] = round(tracking_error, 4)

        # IR
        ann_excess = float(np.mean(excess) * 252)
        result["ir"] = round(ann_excess / tracking_error, 4) if tracking_error > 0 else 0
    else:
        result["beta"] = 1.0
        result["tracking_error"] = None
        result["ir"] = None

    return result


def calc_target_price(df: pd.DataFrame) -> dict:
    """목표주가 · PSR (애널리스트)"""
    result = {}
    cols = df.columns.tolist()

    def get(col):
        if col in cols:
            val = pd.to_numeric(df[col], errors="coerce")
            return float(val.iloc[-1]) if not val.empty else None
        return None

    close = get("close")
    revenue = get("revenue")
    market_cap = get("market_cap")
    net_income = get("net_income")

    # PSR
    if market_cap and revenue and revenue > 0:
        result["psr"] = round(market_cap / revenue, 2)

    # 목표주가 (PER 방식) — 과거 평균 PER 기반
    if "close" in cols and net_income and market_cap and net_income > 0:
        current_per = market_cap / net_income
        target_per = current_per * 1.0  # 현재 PER 기준 (향후 업종 평균으로 대체 가능)
        shares = market_cap / close if close and close > 0 else None
        if shares:
            eps = net_income / shares
            target_price = eps * target_per
            result["target_price"] = round(target_price, 0)
            result["current_per"] = round(current_per, 2)
            if close:
                upside = (target_price - close) / close * 100
                result["upside"] = round(upside, 2)
                result["opinion"] = "매수" if upside >= 20 else ("매도" if upside <= -20 else "중립")

    return result


# ── 6. 직군별 통합 계산 ───────────────────────────
def calculate_by_role(df: pd.DataFrame, role: str) -> dict:
    """직군에 따라 필요한 지표만 계산"""
    if role == "stock":
        return {
            "returns": calc_returns(df),
            "risk": calc_risk(df),
            "risk_adjusted": calc_risk_adjusted(df),
            "technical": calc_technical(df),
        }
    elif role == "fund":
        return {
            "returns": calc_returns(df),
            "risk": calc_risk(df),
            "risk_adjusted": calc_risk_adjusted(df),
            "portfolio_risk": calc_portfolio_risk(df),
        }
    elif role == "financial":
        return {
            "valuation": calc_valuation(df),
            "credit_risk": calc_credit_risk(df),
            "cashflow": calc_cashflow(df),
        }
    elif role == "analyst":
        return {
            "returns": calc_returns(df),
            "valuation": calc_valuation(df),
            "risk": calc_risk(df),
            "target_price": calc_target_price(df), 
        }
    else:
        return {
            "returns": calc_returns(df),
            "risk": calc_risk(df),
        }
