import os
import json
import dart_fss as dart
import anthropic
from dotenv import load_dotenv

load_dotenv()

dart.set_api_key(os.getenv("DART_API_KEY"))
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def get_recent_disclosures(corp_code: str, limit: int = 5) -> list:
    try:
        filings = dart.filings.search(
            corp_code=corp_code,
            bgn_de='20240101',
            page_count=limit
        )
        if filings is None or len(filings.report_list) == 0:
            return []

        results = []
        for item in filings.report_list[:limit]:
            results.append({
                "title": item.report_nm.strip() if item.report_nm else '',
                "date": item.rcept_dt if item.rcept_dt else '',
                "corp_name": item.corp_name if item.corp_name else '',
            })
        return results
    except Exception as e:
        print(f"[공시 수집 오류] {e}")
        return []


def summarize_disclosures_with_claude(ticker: str, corp_name: str, disclosures: list) -> dict:
    if not disclosures:
        return {"success": False, "error": "공시 데이터 없음"}

    disclosure_text = "\n".join([
        f"- [{d['date']}] {d['title']}" for d in disclosures
    ])

    prompt = f"""다음은 {corp_name}({ticker})의 최근 공시 목록입니다.

{disclosure_text}

각 공시를 분석하여 아래 JSON 형식으로만 응답하세요:
{{
  "overall": "긍정 또는 부정 또는 중립",
  "summary": "전체 공시 흐름 한줄 요약 (30자 이내)",
  "items": [
    {{
      "title": "공시 제목",
      "date": "날짜",
      "sentiment": "호재 또는 악재 또는 중립",
      "reason": "판단 근거 한줄 (20자 이내)"
    }}
  ],
  "action": "투자자/담당자 관점에서 다음 행동 권고 (30자 이내)"
}}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        response_text = message.content[0].text.strip()
        if "```" in response_text:
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        result = json.loads(response_text)
        return {"success": True, **result}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_dart_insight(ticker: str) -> dict:
    try:
        corp_list = dart.get_corp_list()
        corp = corp_list.find_by_stock_code(ticker)
        if corp is None:
            return {"success": False, "error": "종목코드에 해당하는 기업을 찾을 수 없습니다"}

        corp_name = corp.corp_name
        corp_code = corp.corp_code

        disclosures = get_recent_disclosures(corp_code)
        if not disclosures:
            return {"success": False, "error": "최근 공시를 찾을 수 없습니다", "corp_name": corp_name}

        summary = summarize_disclosures_with_claude(ticker, corp_name, disclosures)
        return {
            "success": True,
            "corp_name": corp_name,
            "ticker": ticker,
            "disclosures": disclosures,
            **summary
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
