import os
import json
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# 표준 키 목록
STANDARD_KEYS = [
    "date", "ticker", "name", "open", "high", "low", "close", "volume",
    "amount", "return_pct", "market_cap", "foreign_net", "institution_net",
    "short_balance", "revenue", "operating_income", "net_income", "total_asset",
    "total_debt", "equity", "current_asset", "current_liability",
    "interest_expense", "accounts_receivable", "nav", "aum", "mdd",
    "sharpe", "weight", "benchmark"
]

def map_columns_with_ai(unmapped_columns: list) -> dict:
    """
    매핑 안된 컬럼명만 Claude API로 보내서 표준 키로 매핑
    실제 데이터 값은 절대 보내지 않음
    """
    if not unmapped_columns:
        return {}

    prompt = f"""다음은 금융 투자 데이터 파일의 컬럼명 목록입니다.
각 컬럼명을 아래 표준 키 중 가장 적합한 것으로 매핑해주세요.
매핑이 불가능하면 null로 표시하세요.

컬럼명 목록:
{json.dumps(unmapped_columns, ensure_ascii=False)}

표준 키 목록:
{json.dumps(STANDARD_KEYS, ensure_ascii=False)}

반드시 아래 JSON 형식으로만 응답하세요. 설명이나 다른 텍스트 없이 JSON만:
{{"컬럼명": "표준키 또는 null"}}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        response_text = message.content[0].text.strip()

        # JSON 파싱
        if "```" in response_text:
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        mapping = json.loads(response_text)
        # null 제거
        return {k: v for k, v in mapping.items() if v and v != "null"}

    except Exception as e:
        print(f"[AI 매핑 오류] {e}")
        return {}
