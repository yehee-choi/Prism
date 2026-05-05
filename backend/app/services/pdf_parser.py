import os
import json
import base64
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def parse_pdf_with_claude(file_bytes: bytes, filename: str) -> dict:
    """
    PDF 파일을 Claude API로 직접 읽어서
    표준 컬럼 DataFrame으로 변환
    실제 데이터 내용은 Claude가 처리하고
    구조화된 결과만 반환
    """
    try:
        # PDF를 base64로 인코딩
        pdf_base64 = base64.standard_b64encode(file_bytes).decode("utf-8")

        prompt = """이 PDF 문서에서 투자/재무 관련 데이터를 추출해주세요.

추출 규칙:
1. 표, 숫자, 날짜, 재무 항목을 찾아서 구조화
2. 아래 표준 컬럼명으로 매핑:
   - date: 날짜/기준일
   - revenue: 매출액
   - operating_income: 영업이익
   - net_income: 당기순이익
   - total_asset: 총자산
   - total_debt: 총부채
   - equity: 자기자본
   - current_asset: 유동자산
   - current_liability: 유동부채
   - interest_expense: 이자비용
   - accounts_receivable: 매출채권
   - close: 주가/종가
   - volume: 거래량
   - name: 종목명/회사명
   - ticker: 종목코드

3. 금액 단위를 원(KRW)으로 통일
4. 날짜는 YYYY-MM-DD 형식으로

반드시 아래 JSON 형식으로만 응답하세요:
{
  "data_type": "financial 또는 stock 또는 portfolio",
  "rows": [
    {"date": "2024-12-31", "revenue": 1000000000, ...},
    ...
  ],
  "summary": "문서 요약 한줄",
  "unmapped": ["매핑 못한 항목들"]
}"""

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": pdf_base64,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ],
                }
            ],
        )

        response_text = message.content[0].text.strip()

        # JSON 파싱
        if "```" in response_text:
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        result = json.loads(response_text)

        return {
            "success": True,
            "data_type": result.get("data_type", "financial"),
            "row_count": len(result.get("rows", [])),
            "columns": list(result["rows"][0].keys()) if result.get("rows") else [],
            "unmapped_columns": result.get("unmapped", []),
            "ai_mapped_columns": {},
            "warnings": [],
            "removed_rows": 0,
            "summary": result.get("summary", ""),
            "data": result.get("rows", [])
        }

    except Exception as e:
        return {"success": False, "error": f"PDF 파싱 실패: {str(e)}"}
