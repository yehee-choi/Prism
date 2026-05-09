import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

ROLE_FOCUS = {
    "stock": {
        "persona": "주식 투자자",
        "core_question": "이 종목 지금 사도 되는가? 또는 보유 중이라면 계속 들고 있어야 하는가?",
        "priority_metrics": ["수급(외국인·기관)", "RSI", "이동평균 크로스", "MDD", "변동성", "유동비율", "부채비율"],
        "key_questions": [
            "지금 매수/매도/관망 중 어느 액션이 맞는가?",
            "손절 기준은 어디인가?",
            "외국인·기관이 사고 있는가, 팔고 있는가?",
            "재무 상태가 주가에 어떤 영향을 미치는가?",
            "PE 대주주가 있어 엑시트 리스크가 있는가?",
        ],
        "action_keywords": ["매수/매도/관망 결론", "손절 기준", "목표가", "모니터링 주기"],
        "output_format": "반드시 첫 문장에 매수/매도/관망 중 하나로 결론을 내릴 것"
    },
    "fund": {
        "persona": "펀드매니저",
        "core_question": "이 종목을 포트폴리오에 편입해도 되는가? 편입 중이라면 비중을 유지/확대/축소해야 하는가?",
        "priority_metrics": ["샤프지수", "MDD", "칼마비율", "베타", "유동비율", "부채비율", "영업이익률"],
        "key_questions": [
            "편입/제외/비중축소 중 어느 결정이 맞는가?",
            "컴플라이언스 기준(단일종목 15%)을 통과하는가?",
            "위험 대비 수익률이 벤치마크보다 나은가?",
            "재무 리스크가 펀드 전체 포트폴리오에 미치는 영향은?",
            "현금흐름이 배당 지속 가능성을 뒷받침하는가?",
        ],
        "action_keywords": ["편입/제외/비중조정 결론", "리밸런싱 시점", "헤지 전략", "컴플라이언스 통과 여부"],
        "output_format": "반드시 첫 문장에 편입적합/편입부적합/비중축소 중 하나로 결론을 내릴 것"
    },
    "financial": {
        "persona": "회계/재무담당자",
        "core_question": "이 거래처에 외상(신용거래)을 줘도 되는가? 현재 거래 한도를 유지해야 하는가?",
        "priority_metrics": ["유동비율", "이자보상배율", "DSO", "부채비율", "OCF", "자기자본"],
        "key_questions": [
            "신용거래 가능/불가/한도축소 중 어느 결정이 맞는가?",
            "부도 가능성이 얼마나 높은가?",
            "매출채권 회수가 지연될 리스크가 있는가?",
            "자본잠식 또는 완전자본잠식 상태인가?",
            "이자조차 못 내는 상황인가?",
        ],
        "action_keywords": ["신용거래 가능/불가 결론", "거래 한도 조정", "담보 요구 여부", "모니터링 주기"],
        "output_format": "반드시 첫 문장에 신용거래 가능/조건부 가능/불가 중 하나로 결론을 내릴 것"
    },
    "analyst": {
        "persona": "증권 애널리스트",
        "core_question": "목표주가는 얼마인가? 투자의견은 매수/중립/매도 중 무엇인가?",
        "priority_metrics": ["PER", "PBR", "ROE", "영업이익률 YoY", "EV/EBITDA", "부채비율"],
        "key_questions": [
            "적정 목표주가는 얼마인가?",
            "매수/중립/매도 투자의견은?",
            "현재 주가가 고평가인가, 저평가인가?",
            "수익성이 개선되고 있는가, 악화되고 있는가?",
            "동종 업종 대비 밸류에이션 매력도는?",
        ],
        "action_keywords": ["목표주가", "투자의견 매수/중립/매도", "업종 내 선호도", "리스크 요인"],
        "output_format": "반드시 첫 문장에 투자의견(매수/중립/매도)과 목표주가 또는 밸류에이션 판단을 포함할 것"
    },
}


def generate_insight(metrics: dict, role: str, data_type: str, extra_data: dict = None, extra_context: dict = None) -> str:
    focus = ROLE_FOCUS.get(role, ROLE_FOCUS["analyst"])

    triggers = _detect_triggers(metrics, role)
    triggers_text = "\n".join(f"- {t}" for t in triggers) if triggers else "- 특이 신호 없음"
    metrics_text = _format_metrics(metrics)

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

## 핵심 질문 (반드시 이 질문에 답해야 합니다)
{focus['core_question']}

## 출력 형식 요구사항
{focus['output_format']}

## 우선 분석 지표
{chr(10).join(f'- {m}' for m in focus['priority_metrics'])}

## 세부 판단 기준
{chr(10).join(f'- {q}' for q in focus['key_questions'])}

## 감지된 신호
{triggers_text}

## 계산된 지표
{metrics_text}
{context_text}
{extra_data_text}

## 작성 원칙
1. 첫 문장: {focus['output_format']}
2. 수치 기반 — 추측 표현 금지, 구체적 수치 반드시 포함
3. {focus['persona']} 관점에서만 서술
4. 액션 지향: {', '.join(focus['action_keywords'])}
5. 5~7문장, 한국어로 작성
6. **bold** 강조는 결론 문장에만 사용

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
    triggers = []
    returns = metrics.get("returns", {})
    risk = metrics.get("risk", {})
    risk_adj = metrics.get("risk_adjusted", {})
    valuation = metrics.get("valuation", {})
    credit = metrics.get("credit_risk", {})
    technical = metrics.get("technical", {})

    if risk.get("mdd") and abs(risk["mdd"]) > 0.2:
        triggers.append(f"🚨 MDD {risk['mdd']*100:.1f}% — 최대낙폭 20% 초과")
    if credit.get("current_ratio") and credit["current_ratio"] < 100:
        triggers.append(f"🚨 유동비율 {credit['current_ratio']:.1f}% — 100% 미만")
    if credit.get("interest_coverage") and credit["interest_coverage"] < 1:
        triggers.append(f"🚨 이자보상배율 {credit['interest_coverage']:.2f}배 — 이자 미충당")
    if valuation.get("debt_ratio") and valuation["debt_ratio"] > 200:
        triggers.append(f"⚠️ 부채비율 {valuation['debt_ratio']:.1f}% — 200% 초과")
    if valuation.get("operating_margin") and valuation["operating_margin"] < 0:
        triggers.append(f"⚠️ 영업이익률 {valuation['operating_margin']:.1f}% — 영업 적자")

    if role == "stock":
        if technical.get("rsi_signal") == "과매수":
            triggers.append(f"⚠️ RSI {technical.get('rsi')} — 과매수 구간")
        elif technical.get("rsi_signal") == "과매도":
            triggers.append(f"📌 RSI {technical.get('rsi')} — 과매도 구간")
        if technical.get("cross_signal") == "데드크로스":
            triggers.append("🚨 데드크로스 — 하락 추세 전환")
        elif technical.get("cross_signal") == "골든크로스":
            triggers.append("📌 골든크로스 — 상승 추세 전환")

    elif role == "fund":
        if risk_adj.get("sharpe") and risk_adj["sharpe"] < 0:
            triggers.append(f"🚨 샤프지수 {risk_adj['sharpe']:.2f} — 무위험자산 수익률 미달")
        if risk.get("calmar") and risk["calmar"] < 0.5:
            triggers.append(f"⚠️ 칼마비율 {risk['calmar']:.2f} — 위험 대비 수익 부족")

    elif role == "financial":
        if credit.get("dso") and credit["dso"] > 75:
            triggers.append(f"⚠️ DSO {credit['dso']:.1f}일 — 매출채권 회수 75일 초과")
        # 자기자본 마이너스 감지
        if valuation.get("debt_ratio") and valuation["debt_ratio"] < 0:
            triggers.append("🚨 부채비율 음수 — 완전 자본잠식 상태")

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