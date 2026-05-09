from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.parser import parse_file
from app.services.pdf_parser import parse_pdf_with_claude
from app.services.ai_mapper import analyze_file_with_ai, has_enough_financial_data

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """
    파일 업로드 → Skills.md 파싱 → Claude 전체 파일 분석
    재무 데이터 부족 시 DART에서 자동 보완 (비상장사 포함)
    """
    allowed = ["csv", "xlsx", "xls", "json", "pdf"]
    ext = file.filename.split(".")[-1].lower()

    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 파일 형식: {ext}")

    file_bytes = await file.read()

    if ext == "pdf":
        result = parse_pdf_with_claude(file_bytes, file.filename)
    else:
        result = parse_file(file_bytes, file.filename)

    if not result["success"]:
        raise HTTPException(status_code=422, detail=result["error"])

    import pandas as pd
    df = pd.DataFrame(result.get("data", []))
    unmapped = result.get("unmapped_columns", [])

    # ── Claude 파일 전체 분석 ──────────────────────
    ai_analysis = analyze_file_with_ai(df, unmapped)

    extra_mapping = ai_analysis.get("column_mapping", {})
    if extra_mapping:
        df = df.rename(columns=extra_mapping)
        result["data"] = df.to_dict(orient="records")
        result["unmapped_columns"] = [c for c in unmapped if c not in extra_mapping]

    result["extra_context"] = ai_analysis.get("extra_context", {})

    # ── 종목 식별 ──────────────────────────────────
    identified_name = ai_analysis.get("identified_name")
    identified_ticker = ai_analysis.get("identified_ticker")

    # ticker 컬럼에서 추출 시도
    if not identified_ticker and "ticker" in df.columns:
        first_ticker = df["ticker"].dropna().astype(str).iloc[0] if not df["ticker"].dropna().empty else None
        if first_ticker and first_ticker.isdigit():
            identified_ticker = first_ticker.zfill(6)

    # name 컬럼에서 추출 시도
    if not identified_name and "name" in df.columns:
        first_name = df["name"].dropna().astype(str).iloc[0] if not df["name"].dropna().empty else None
        if first_name:
            identified_name = first_name

    # ── DART 재무제표 자동 보완 ────────────────────
    dart_supplement = {}
    if not has_enough_financial_data(df) and (identified_ticker or identified_name):
        try:
            from app.services.corp_cache import get_corp_code, get_corp_name, get_corp_code_by_name
            from app.services.dart_insight import get_financial_data

            corp_code = None

            # 1순위: ticker로 corp_code 변환 (상장사)
            if identified_ticker:
                corp_code = get_corp_code(identified_ticker)
                print(f"[DART 보완] ticker {identified_ticker} → corp_code: {corp_code}")

            # 2순위: 이름으로 corp_code 직접 변환 (상장사 + 비상장사)
            if not corp_code and identified_name:
                corp_code = get_corp_code_by_name(identified_name)
                print(f"[DART 보완] 이름 '{identified_name}' → corp_code: {corp_code}")

            if corp_code:
                print(f"[DART 보완] corp_code: {corp_code} 재무제표 조회 시작")
                financial = get_financial_data(corp_code)

                if financial and (financial.get("bs") or financial.get("is_")):
                    dart_row = {}

                    bs_map = {
                        "자산총계": "total_asset", "부채총계": "total_debt",
                        "자본총계": "equity", "유동자산": "current_asset",
                        "유동부채": "current_liability",
                    }
                    for item in financial.get("bs", []):
                        if item["account"] in bs_map and item["current"] is not None:
                            dart_row[bs_map[item["account"]]] = item["current"]

                    is_map = {
                        "매출액": "revenue", "수익(매출액)": "revenue",
                        "영업이익": "operating_income", "영업이익(손실)": "operating_income",
                        "당기순이익": "net_income", "당기순이익(손실)": "net_income",
                    }
                    for item in financial.get("is_", []):
                        if item["account"] in is_map and item["current"] is not None:
                            key = is_map[item["account"]]
                            if key not in dart_row:
                                dart_row[key] = item["current"]

                    if dart_row:
                        # 기존 df에 없는 컬럼만 보완
                        for col, val in dart_row.items():
                            if col not in df.columns:
                                df[col] = val

                        result["data"] = df.to_dict(orient="records")
                        corp_name = get_corp_name(identified_ticker) if identified_ticker else identified_name
                        dart_supplement = {
                            "year": financial.get("year"),
                            "source": "DART 자동 보완",
                            "corp_name": corp_name,
                            "columns_added": list(dart_row.keys()),
                        }
                        print(f"[DART 보완] 완료: {list(dart_row.keys())}")
            else:
                print(f"[DART 보완] corp_code를 찾을 수 없음: ticker={identified_ticker}, name={identified_name}")

        except Exception as e:
            print(f"[DART 보완 오류] {e}")

    result["dart_supplement"] = dart_supplement
    result["identified_ticker"] = identified_ticker
    result["identified_name"] = identified_name

    return result