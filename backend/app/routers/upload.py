from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.parser import parse_file
from app.services.pdf_parser import parse_pdf_with_claude
from app.services.ai_mapper import analyze_file_with_ai

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """
    파일 업로드 → Skills.md 파싱 → Claude 전체 파일 분석
    반환값에 extra_context 포함 (insight 생성 시 활용)
    """
    allowed = ["csv", "xlsx", "xls", "json", "pdf"]
    ext = file.filename.split(".")[-1].lower()

    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 파일 형식: {ext}")

    file_bytes = await file.read()

    # PDF는 Claude API로 처리
    if ext == "pdf":
        result = parse_pdf_with_claude(file_bytes, file.filename)
    else:
        result = parse_file(file_bytes, file.filename)

    if not result["success"]:
        raise HTTPException(status_code=422, detail=result["error"])

    # ── Claude 파일 전체 분석 (핵심 변경) ──────────
    import pandas as pd
    df = pd.DataFrame(result.get("data", []))
    unmapped = result.get("unmapped_columns", [])

    ai_analysis = analyze_file_with_ai(df, unmapped)

    # 추가 컬럼 매핑 적용 (ai_mapper가 찾아낸 것)
    extra_mapping = ai_analysis.get("column_mapping", {})
    if extra_mapping:
        df = df.rename(columns=extra_mapping)
        result["data"] = df.to_dict(orient="records")
        # unmapped에서 매핑된 것 제거
        result["unmapped_columns"] = [c for c in unmapped if c not in extra_mapping]

    # extra_context를 결과에 포함 → 프론트가 insight 호출 시 함께 전달
    result["extra_context"] = ai_analysis.get("extra_context", {})

    return result