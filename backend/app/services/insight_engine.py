import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

ROLE_CONTEXT = {
    "stock": "주식 투자자 관점에서 수급·공매도·지배구조 리스크 중심으로",
    "fund": "펀드매니저 관점에서 위험조정수익률·팩터·컴플라이언스 중심으로",
    "financial": "회계/재무담당자 관점에서 거래처 신용리스크·부도경보·DSO 중심으로",
    "analyst": "애널리스트 관점에서 밸류에이션·수익성·성장성 중심으로",
}

def generate_insight(metrics: dict, role: str, data_type: str) -> str:
    """
    Skills.md 트리거 조건 기반 Claude API 인사이트 생성
    실제 수치만 전달, 원본 데이터는 전달하지 않음
    """
    role_ctx = ROLE_CONTEXT.get(role, "투자 전문가 관점에서")

    # 트리거 조건 체크 (Skills.md 8-1 기준)
    triggers = []

    returns = metrics.get("returns", {})
    risk = metrics.get("risk", {})
    risk_adj = metrics.get("risk_adjusted", {})
    valuation = metrics.get("valuation", {})
    credit = metrics.get("credit_risk", {})

    if risk.get("mdd") and abs(risk["mdd"]) > 0.2:
        triggers.append(f"MDD {risk['mdd']*100:.1f}% — 최대낙폭 20% 초과 (리스크 경보)")

    if risk.get("volatility") and risk["volatility"] > 0.4:
        triggers.append(f"연율화 변동성 {risk['volatility']*100:.1f}% — 고위험 구간")

    if risk_adj.get("sharpe") and risk_adj["sharpe"] < 0:
        triggers.append(f"샤프지수 {risk_adj['sharpe']:.2f} — 무위험자산 수익률 미달")

    if returns.get("simple_return") and returns["simple_return"] > 0.05:
        triggers.append(f"단순 수익률 {returns['simple_return']*100:.1f}% — 양호한 수익 구간")

    if credit.get("current_ratio") and credit["current_ratio"] < 100:
        triggers.append(f"유동비율 {credit['current_ratio']:.1f}% — 100% 미만 유동성 위험")

    if credit.get("interest_coverage") and credit["interest_coverage"] < 1:
        triggers.append(f"이자보상배율 {credit['interest_coverage']:.2f}배 — 이자 미충당 위험")

    if credit.get("dso") and credit["dso"] > 75:
        triggers.append(f"DSO {credit['dso']:.1f}일 — 매출채권 회수 지연 (기준 75일)")

    if valuation.get("debt_ratio") and valuation["debt_ratio"] > 200:
        triggers.append(f"부채비율 {valuation['debt_ratio']:.1f}% — 재무 레버리지 과다")

    if valuation.get("operating_margin") and valuation["operating_margin"] < 0:
        triggers.append(f"영업이익률 {valuation['operating_margin']:.1f}% — 영업 적자 구간")

    triggers_text = "\n".join(f"- {t}" for t in triggers) if triggers else "- 특이 신호 없음"

    prompt = f"""당신은 금융 투자 분석 전문가입니다.
아래 지표를 바탕으로 {role_ctx} 인사이트를 작성해주세요.

## 감지된 신호
{triggers_text}

## 주요 지표
{_format_metrics(metrics)}

## 작성 원칙
1. 수치 기반으로 작성 (추측 표현 금지)
2. 구체적 수치 명시 ("크게 하락" 대신 "전월 대비 -8.3% 하락")
3. 액션 지향 ("확인 필요", "재검토 권고" 등 다음 행동 포함)
4. 3~5문장으로 간결하게
5. 한국어로 작성

인사이트:"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text.strip()
    except Exception as e:
        return f"인사이트 생성 오류: {str(e)}"


def _format_metrics(metrics: dict) -> str:
    lines = []
    r = metrics.get("returns", {})
    if r:
        lines.append(f"수익률: 단순 {r.get('simple_return', 0)*100:.2f}%, CAGR {r.get('cagr', 0)*100:.2f}%")

    rk = metrics.get("risk", {})
    if rk:
        lines.append(f"위험: MDD {rk.get('mdd', 0)*100:.2f}%, 변동성 {rk.get('volatility', 0)*100:.2f}%, VaR(95%) {rk.get('var_95', 0)*100:.2f}%")

    ra = metrics.get("risk_adjusted", {})
    if ra:
        lines.append(f"위험조정: 샤프지수 {ra.get('sharpe', 0):.2f}, 연율화수익률 {ra.get('ann_return', 0)*100:.2f}%")

    v = metrics.get("valuation", {})
    if v:
        parts = []
        if v.get("operating_margin"): parts.append(f"영업이익률 {v['operating_margin']:.1f}%")
        if v.get("roe"): parts.append(f"ROE {v['roe']:.1f}%")
        if v.get("debt_ratio"): parts.append(f"부채비율 {v['debt_ratio']:.1f}%")
        if parts: lines.append(f"밸류에이션: {', '.join(parts)}")

    c = metrics.get("credit_risk", {})
    if c:
        parts = []
        if c.get("current_ratio"): parts.append(f"유동비율 {c['current_ratio']:.1f}%")
        if c.get("interest_coverage"): parts.append(f"이자보상배율 {c['interest_coverage']:.2f}배")
        if c.get("dso"): parts.append(f"DSO {c['dso']:.1f}일")
        if parts: lines.append(f"신용위험: {', '.join(parts)}")

    return "\n".join(lines) if lines else "지표 없음"
