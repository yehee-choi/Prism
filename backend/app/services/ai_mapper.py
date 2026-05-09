import os
import json
import anthropic
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

STANDARD_KEYS = [
    "date", "ticker", "name", "open", "high", "low", "close", "volume",
    "amount", "return_pct", "market_cap", "foreign_net", "institution_net",
    "short_balance", "revenue", "operating_income", "net_income", "total_asset",
    "total_debt", "equity", "current_asset", "current_liability",
    "interest_expense", "accounts_receivable", "nav", "aum", "mdd",
    "sharpe", "weight", "benchmark"
]


def analyze_file_with_ai(df: pd.DataFrame, unmapped_columns: list) -> dict:
    """
    파일 전체를 Claude에 보내 한 번의 호출로:
    1. 미매핑 컬럼 → 표준 키 매핑
    2. 텍스트 컬럼 내용 요약
    3. 비표준 수치 컬럼 분석
    4. 파일 전체 특이사항 추출
    """
    if df.empty:
        return {"column_mapping": {}, "extra_context": {}}

    # 샘플 데이터 구성 (최대 5행, 개인정보 노출 최소화)
    sample = df.head(5).copy()

    # 컬럼별 메타 정보 구성
    col_meta = {}
    for col in df.columns:
        series = df[col]
        numeric = pd.to_numeric(series, errors="coerce")
        is_numeric = numeric.notna().sum() > len(series) * 0.5

        if is_numeric:
            col_meta[col] = {
                "type": "numeric",
                "sample": numeric.dropna().head(3).tolist(),
                "min": round(float(numeric.min()), 2) if numeric.notna().any() else None,
                "max": round(float(numeric.max()), 2) if numeric.notna().any() else None,
                "latest": round(float(numeric.dropna().iloc[-1]), 2) if numeric.notna().any() else None,
            }
        else:
            # 텍스트 컬럼: 샘플 값 전달
            text_samples = series.dropna().astype(str).head(3).tolist()
            col_meta[col] = {
                "type": "text",
                "sample": text_samples,
            }

    prompt = f"""당신은 금융 데이터 분석 전문가입니다.
아래는 사용자가 업로드한 투자 데이터 파일의 컬럼 정보입니다.

## 파일 컬럼 정보
{json.dumps(col_meta, ensure_ascii=False, indent=2)}

## 표준 키 목록
{json.dumps(STANDARD_KEYS, ensure_ascii=False)}

## 미매핑 컬럼 (표준 키로 변환이 필요한 컬럼)
{json.dumps(unmapped_columns, ensure_ascii=False)}

다음 JSON 형식으로만 응답하세요. 설명이나 마크다운 없이 JSON만:

{{
  "column_mapping": {{
    "컬럼명": "표준키 또는 null"
  }},
  "text_analysis": {{
    "텍스트컬럼명": "해당 컬럼의 내용 요약 및 분석적 의미 (예: 감사의견 한정→재무위험, 경영진코멘트에서 유동성위기 언급 등)"
  }},
  "extra_numeric": {{
    "비표준수치컬럼명": {{
      "latest": 최신값,
      "trend": "증가/감소/보합",
      "financial_meaning": "이 수치의 재무적 의미"
    }}
  }},
  "file_summary": "이 파일이 담고 있는 정보의 전체 성격과 핵심 특이사항을 2~3문장으로 요약",
  "anomalies": ["데이터에서 발견된 특이사항 또는 위험 신호 목록"]
}}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        response_text = message.content[0].text.strip()

        if "```" in response_text:
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.rstrip("`").strip()

        result = json.loads(response_text)

        # null 제거
        mapping = {k: v for k, v in result.get("column_mapping", {}).items() if v and v != "null"}

        return {
            "column_mapping": mapping,
            "extra_context": {
                "text_analysis": result.get("text_analysis", {}),
                "extra_numeric": result.get("extra_numeric", {}),
                "file_summary": result.get("file_summary", ""),
                "anomalies": result.get("anomalies", []),
            }
        }

    except Exception as e:
        print(f"[AI 파일 분석 오류] {e}")
        return {"column_mapping": {}, "extra_context": {}}


# 기존 함수 호환성 유지
def map_columns_with_ai(unmapped_columns: list) -> dict:
    """레거시 호환용 — 컬럼명만 매핑 (extra_context 없음)"""
    if not unmapped_columns:
        return {}

    prompt = f"""다음 금융 데이터 컬럼명을 표준 키로 매핑하세요.
컬럼명: {json.dumps(unmapped_columns, ensure_ascii=False)}
표준 키: {json.dumps(STANDARD_KEYS, ensure_ascii=False)}
JSON으로만 응답: {{"컬럼명": "표준키 또는 null"}}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )
        response_text = message.content[0].text.strip()
        if "```" in response_text:
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        mapping = json.loads(response_text)
        return {k: v for k, v in mapping.items() if v and v != "null"}
    except Exception as e:
        print(f"[AI 매핑 오류] {e}")
        return {}