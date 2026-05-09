import pandas as pd
import io
from app.services.normalizer import run_normalization
from app.services.validator import validate
from app.services.ai_mapper import map_columns_with_ai

def detect_data_type(df: pd.DataFrame) -> str:
    cols_clean = [str(c).lower().replace('(', '').replace(')', '').replace(' ', '').replace('_', '') for c in df.columns.tolist()]
    ohlc = {'시가', '고가', '저가', '종가', 'open', 'high', 'low', 'close'}
    if len(set(cols_clean) & ohlc) >= 2:
        return "stock"
    financial_keywords = ['매출액', '영업이익', '순이익', '당기순이익', 'revenue', 'operatingincome', 'netincome']
    for kw in financial_keywords:
        for col in cols_clean:
            if kw in col:
                return "financial"
    fund_keywords = ['기준가', 'nav', '샤프', 'mdd', 'sharpe']
    for kw in fund_keywords:
        for col in cols_clean:
            if kw in col:
                return "fund"
    portfolio_keywords = ['종목명', '비중', '편입비중', 'weight', 'name']
    return_keywords = ['수익률', 'return', 'returnpct']
    has_portfolio = any(any(kw in col for kw in portfolio_keywords) for col in cols_clean)
    has_return = any(any(kw in col for kw in return_keywords) for col in cols_clean)
    if has_portfolio and not has_return:
        return "portfolio"
    return "unknown"


def extract_extra_insights(df: pd.DataFrame, unmapped: list) -> dict:
    extra = {}
    for col in unmapped:
        if col not in df.columns:
            continue
        series = df[col].dropna()
        if len(series) == 0:
            continue
        if pd.api.types.is_numeric_dtype(series):
            latest = series.iloc[-1]
            first = series.iloc[0]
            change_pct = ((latest - first) / abs(first) * 100) if first != 0 else None
            extra[col] = {
                "latest": round(float(latest), 4),
                "first": round(float(first), 4),
                "change_pct": round(change_pct, 2) if change_pct is not None else None,
                "type": "numeric"
            }
        else:
            extra[col] = {
                "latest": str(series.iloc[-1]),
                "type": "text"
            }
    return extra


def parse_file(file_bytes: bytes, filename: str) -> dict:
    ext = filename.split(".")[-1].lower()
    try:
        if ext == "csv":
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding='utf-8-sig')
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding='cp949')
        elif ext in ("xlsx", "xls"):
            xl = pd.ExcelFile(io.BytesIO(file_bytes))
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

    norm_result = run_normalization(df)   # 정규화 먼저
    df = norm_result["df"]
    unmapped = norm_result["unmapped_columns"]
    data_type = detect_data_type(df)      # 정규화 후 표준 컬럼명으로 감지

    ai_mapped = {}
    if unmapped:
        print(f"[AI 매핑] 미매핑 컬럼 {len(unmapped)}개 → Claude API 호출")
        ai_mapped = map_columns_with_ai(unmapped)
        if ai_mapped:
            df = df.rename(columns=ai_mapped)
            unmapped = [c for c in unmapped if c not in ai_mapped]
            print(f"[AI 매핑] 완료: {ai_mapped}")

    extra_data = extract_extra_insights(df, unmapped)

    val_result = validate(df, skip_date_gap=(data_type == "financial"))
    df = val_result["df"]

    return {
        "success": True,
        "data_type": data_type,
        "row_count": len(df),
        "columns": df.columns.tolist(),
        "unmapped_columns": unmapped,
        "ai_mapped_columns": ai_mapped,
        "extra_data": extra_data,
        "warnings": val_result["warnings"],
        "removed_rows": val_result["removed_rows"],
        "data": df.to_dict(orient='records')
    }