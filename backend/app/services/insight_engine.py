import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# ── 직군별 분석 포커스 (구체적 지시) ────────────────────────
ROLE_FOCUS = {
    "stock": {
        "persona": "주식 투자자",
        "priority_metrics": ["수급(외국인·기관)", "공매도 잔고", "RSI", "이동평균 크로스", "MDD", "변동성"],
        "key_questions": [
            "외국인·기관의 순매수/순매도 방향이 바뀌고 있는가?",
            "공매도 잔고가 급증하고 있는가?",
            "RSI 과매수/과매도 구간인가?",
            "골든크로스/데드크로스 신호가 있는가?",
            "PE(사모펀드) 대주주가 있어 엑시트 리스크가 있는가?",
        ],
        "action_keywords": ["매수/매도 타이밍", "포지션 조정", "손절 기준", "모니터링 주기"],
    },
    "fund": {
        "persona": "펀드매니저",
        "priority_metrics": ["샤프지수", "CAGR", "MDD", "칼마비율", "베타", "Tracking Error", "IR"],
        "key_questions": [
            "위험 대비 수익률(샤프)이 벤치마크 대비 어떤가?",
            "MDD 수준이 펀드 운용 기준 내인가?",
            "베타가 시장 방향성과 일치하는가?",
            "단일 종목 15% 초과 편입 등 컴플라이언스 위반이 있는가?",
            "칼마비율 기준 위험 대비 성과가 충분한가?",
        ],
        "action_keywords": ["리밸런싱 필요성", "헤지 전략", "컴플라이언스 점검", "벤치마크 대비 초과수익"],
    },
    "financial": {
        "persona": "회계/재무담당자",
        "priority_metrics": ["유동비율", "이자보상배율", "DSO", "부채비율", "OCF", "부도경보 스코어"],
        "key_questions": [
            "유동비율이 100% 미만으로 단기 지급불능 위험이 있는가?",
            "이자보상배율이 1 미만으로 이자조차 못 내는 상황인가?",
            "DSO가 75일을 초과해 매출채권 회수가 지연되고 있는가?",
            "자기자본이 마이너스(완전 자본잠식)인가?",
            "OCF가 음수인데 영업이익은 양수인 흑자도산 위험은 없는가?",
            "거래처의 PE 대주주 엑시트로 인한 경영 공백 리스크는 없는가?",
        ],
        "action_keywords": ["거래 한도 조정", "담보 강화", "월 단위 재무 모니터링", "법적 보호 조치"],
    },
    "analyst": {
        "persona": "증권 애널리스트",
        "priority_metrics": ["PER", "PBR", "ROE", "영업이익률", "EV/EBITDA", "목표주가 괴리율"],
        "key_questions": [
            "현재 PER이 업종 평균 대비 고평가/저평가인가?",
            "ROE 추이가 개선되고 있는가?",
            "영업이익률이 YoY 개선/악화되고 있는가?",
            "EV/EBITDA 기준 적정 밸류에이션 범위인가?",
            "목표주가 대비 현재가 괴리율이 매수 기회인가?",
        ],
        "action_keywords": ["목표주가 상향/하향", "투자의견 변경", "업종 내 상대 매력도", "리비전 방향"],
    },
}


def generate_insight(metrics: dict, role: str, data_type: str, extra_data: dict = None, extra_context: dict = None) -> str:
    """
    직군별 맞춤 인사이트 생성
    - extra_data: 기존 비표준 수치 컬럼 (하위 호환)
    - extra_context: ai_mapper의 전체 파일 분석 결과 (신규)
    """
    focus = ROLE_FOCUS.get(role, ROLE_FOCUS["analyst"])

    # ── 트리거 조건 감지 ──────────────────────────
    triggers = _detect_triggers(metrics, role)
    triggers_text = "\n".join(f"- {t}" for t in triggers) if triggers else "- 특이 신호 없음"

    # ── 계산된 표준 지표 포맷 ─────────────────────
    metrics_text = _format_metrics(metrics)

    # ── extra_context (파일 고유 정보) ────────────
    context_text = ""
    if extra_context:
        parts = []
        if extra_context.get("file_summary"):
            parts.append(f"**파일 요약**: {extra_context['file_summary']}")
        if extra_context.get("text_analysis"):
            lines = [f"  - {col}: {summary}" for col, summary in extra_context["text_analysis"].items()]
            parts.append("**텍스트 데이터 분석**:\n" + "\n".join(lines))
        if extra_context.get("extra_numeric"):
            lines = []
            for col, info in extra_context["extra_numeric"].items():
                lines.append(f"  - {col}: 최신값 {info.get('latest')}, 추이 {info.get('trend')}, 의미: {info.get('financial_meaning')}")
            parts.append("**추가 수치 데이터**:\n" + "\n".join(lines))
        if extra_context.get("anomalies"):
            lines = [f"  - {a}" for a in extra_context["anomalies"]]
            parts.append("**파일에서 감지된 특이사항**:\n" + "\n".join(lines))
        if parts:
            context_text = "\n\n## 파일 고유 정보 (반드시 활용)\n" + "\n\n".join(parts)

    # ── 기존 extra_data 하위 호환 ─────────────────
    extra_data_text = ""
    if extra_data:
        lines = []
        for col, info in extra_data.items():
            if isinstance(info, dict) and info.get("type") == "numeric":
                change_str = f", 기간 변화 {info['change_pct']:+.1f}%" if info.get("change_pct") else ""
                lines.append(f"- {col}: 최신값 {info.get('latest')}{change_str}")
            else:
                lines.append(f"- {col}: {info.get('latest', info)}")
        if lines:
            extra_data_text = "\n\n## 추가 데이터\n" + "\n".join(lines)

    prompt = f"""당신은 {focus['persona']} 전문가입니다.
아래 데이터를 분석하여 {focus['persona']} 관점의 인사이트를 작성하세요.

## 우선 분석 지표
{chr(10).join(f'- {m}' for m in focus['priority_metrics'])}

## 반드시 답해야 할 핵심 질문
{chr(10).join(f'- {q}' for q in focus['key_questions'])}

## 감지된 신호
{triggers_text}

## 계산된 지표
{metrics_text}
{context_text}
{extra_data_text}

## 작성 원칙
1. 수치 기반 작성 — 추측 표현("~것으로 보임") 금지
2. 구체적 수치 명시 ("크게 하락" 대신 "전년 대비 -8.3%p 하락")
3. 파일 고유 정보(텍스트 분석·특이사항)가 있으면 반드시 인사이트에 반영
4. {focus['persona']} 관점에서만 서술 — 다른 직군 관점 섞지 말 것
5. 액션 지향: {', '.join(focus['action_keywords'])} 관련 다음 행동 포함
6. 5~7문장, 한국어로 작성

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


def _detect_triggers(metrics: dict, role: str) -> list:
    """직군별 우선 트리거 감지"""
    triggers = []
    returns = metrics.get("returns", {})
    risk = metrics.get("risk", {})
    risk_adj = metrics.get("risk_adjusted", {})
    valuation = metrics.get("valuation", {})
    credit = metrics.get("credit_risk", {})
    technical = metrics.get("technical", {})

    # 공통 트리거
    if risk.get("mdd") and abs(risk["mdd"]) > 0.2:
        triggers.append(f"🚨 MDD {risk['mdd']*100:.1f}% — 최대낙폭 20% 초과")
    if credit.get("current_ratio") and credit["current_ratio"] < 100:
        triggers.append(f"🚨 유동비율 {credit['current_ratio']:.1f}% — 100% 미만 유동성 위험")
    if credit.get("interest_coverage") and credit["interest_coverage"] < 1:
        triggers.append(f"🚨 이자보상배율 {credit['interest_coverage']:.2f}배 — 이자 미충당")
    if valuation.get("debt_ratio") and valuation["debt_ratio"] > 200:
        triggers.append(f"⚠️ 부채비율 {valuation['debt_ratio']:.1f}% — 200% 초과")
    if valuation.get("operating_margin") and valuation["operating_margin"] < 0:
        triggers.append(f"⚠️ 영업이익률 {valuation['operating_margin']:.1f}% — 영업 적자")

    # 직군별 추가 트리거
    if role == "stock":
        if technical.get("rsi_signal") == "과매수":
            triggers.append(f"⚠️ RSI {technical.get('rsi')} — 과매수 구간")
        elif technical.get("rsi_signal") == "과매도":
            triggers.append(f"📌 RSI {technical.get('rsi')} — 과매도 구간 (반등 가능성)")
        if technical.get("cross_signal") == "데드크로스":
            triggers.append("🚨 데드크로스 발생 — 단기 하락 추세 전환")
        elif technical.get("cross_signal") == "골든크로스":
            triggers.append("📌 골든크로스 발생 — 단기 상승 추세 전환")

    elif role == "fund":
        if risk_adj.get("sharpe") and risk_adj["sharpe"] < 0:
            triggers.append(f"🚨 샤프지수 {risk_adj['sharpe']:.2f} — 무위험자산 수익률 미달")
        if risk.get("calmar") and risk["calmar"] < 0.5:
            triggers.append(f"⚠️ 칼마비율 {risk['calmar']:.2f} — 위험 대비 수익 부족")

    elif role == "financial":
        if credit.get("dso") and credit["dso"] > 75:
            triggers.append(f"⚠️ DSO {credit['dso']:.1f}일 — 매출채권 회수 75일 초과")

    elif role == "analyst":
        if valuation.get("roe") and valuation["roe"] < 5:
            triggers.append(f"⚠️ ROE {valuation['roe']:.1f}% — 자본 활용 효율 저하")

    return triggers


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
        if v.get("operating_margin") is not None: parts.append(f"영업이익률 {v['operating_margin']:.1f}%")
        if v.get("roe") is not None: parts.append(f"ROE {v['roe']:.1f}%")
        if v.get("debt_ratio") is not None: parts.append(f"부채비율 {v['debt_ratio']:.1f}%")
        if parts: lines.append(f"밸류에이션: {', '.join(parts)}")
    c = metrics.get("credit_risk", {})
    if c:
        parts = []
        if c.get("current_ratio") is not None: parts.append(f"유동비율 {c['current_ratio']:.1f}%")
        if c.get("interest_coverage") is not None: parts.append(f"이자보상배율 {c['interest_coverage']:.2f}배")
        if c.get("dso") is not None: parts.append(f"DSO {c['dso']:.1f}일")
        if parts: lines.append(f"신용위험: {', '.join(parts)}")
    t = metrics.get("technical", {})
    if t:
        parts = []
        if t.get("rsi") is not None: parts.append(f"RSI {t['rsi']} ({t.get('rsi_signal', '')})")
        if t.get("cross_signal"): parts.append(f"크로스 신호: {t['cross_signal']}")
        if parts: lines.append(f"기술적 지표: {', '.join(parts)}")
    return "\n".join(lines) if lines else "계산된 지표 없음"