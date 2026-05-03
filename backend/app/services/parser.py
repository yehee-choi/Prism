import pandas as pd
import io
from app.services.normalizer import run_normalization
from app.services.validator import validate

def detect_data_type(df: pd.DataFrame) -> str:
    """컬럼명 패턴으로 데이터 유형 자동 감지 (Skills.md 2 기준)"""
    cols = set(df.columns.tolist())

    # 1순위: 주식 시세
    ohlc = {"시가", "고가", "저가", "종가", "Open", "High", "Low", "Close",
            "open", "high", "low", "close"}
    if len(cols & ohlc) >= 2:
        return "stock"

    # 2순위: 재무제표
    financial = {"매출액", "영업이익", "순이익", "Revenue", "OperatingIncome",
                 "revenue", "operating_income", "net_income"}
    if cols & financial:
        return "financial"

    # 3순위: 펀드/포트폴리오
    fund = {"기준가", "NAV", "샤프", "MDD", "Sharpe", "nav", "sharpe", "mdd"}
    if cols & fund:
        return "fund"

    # 4순위: 포트폴리오 구성
    portfolio = {"종목명", "비중", "편입비중", "Weight", "weight", "name"}
    return_cols = {"수익률", "Return", "return_pct"}
    if (cols & portfolio) and not (cols & return_cols):
        return "portfolio"

    return "unknown"


def parse_file(file_bytes: bytes, filename: str) -> dict:
    """파일 파싱 → 정규화 → 검증 → 결과 반환"""
    ext = filename.split(".")[-1].lower()

    # 1. 파일 읽기
    try:
        if ext == "csv":
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding='utf-8-sig')
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding='cp949')

        elif ext in ("xlsx", "xls"):
            xl = pd.ExcelFile(io.BytesIO(file_bytes))
            # 첫 번째 유효 시트 사용
            df = None
            for sheet in xl.sheet_names:
                tmp = xl.parse(sheet)
                if len(tmp) > 0:
                    df = tmp
                    break
            if df is None:
                return {"success": False, "error": "유효한 시트를 찾을 수 없습니다"}

        elif ext == "json":
            try:
                df = pd.read_json(io.BytesIO(file_bytes), orient='records')
            except:
                df = pd.read_json(io.BytesIO(file_bytes), orient='columns')

        else:
            return {"success": False, "error": f"지원하지 않는 파일 형식: {ext}"}

    except Exception as e:
        return {"success": False, "error": f"파일 읽기 실패: {str(e)}"}

    # 2. 데이터 유형 감지 (정규화 전 원본 컬럼으로)
    data_type = detect_data_type(df)

    # 3. 정규화
    norm_result = run_normalization(df)
    df = norm_result["df"]
    unmapped = norm_result["unmapped_columns"]

    # 4. 품질 검증
    val_result = validate(df)
    df = val_result["df"]

    return {
        "success": True,
        "data_type": data_type,
        "row_count": len(df),
        "columns": df.columns.tolist(),
        "unmapped_columns": unmapped,
        "warnings": val_result["warnings"],
        "removed_rows": val_result["removed_rows"],
        "data": df.to_dict(orient='records')
    }
