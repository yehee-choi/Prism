from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.parser import parse_file
from app.services.pdf_parser import parse_pdf_with_claude

router = APIRouter(prefix="/upload", tags=["upload"])

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """파일 업로드 → Skills.md 엔진 파싱 → 결과 반환"""
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

    return result
