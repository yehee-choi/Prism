import pandas as pd
from datetime import datetime

def validate(df: pd.DataFrame, skip_date_gap: bool = False) -> dict:
    warnings = []
    removed_rows = 0
    # 재무제표(skip_date_gap=True)는 행수 체크 스킵
    # 주가 데이터만 20행 기준 적용
    if not skip_date_gap and len(df) < 20:
        warnings.append({"level": "error", "msg": f"데이터가 {len(df)}행으로 분석 불가 (최소 20행 필요)"})
        return {"df": df, "warnings": warnings, "removed_rows": removed_rows}
    
    # 재무제표는 행수 경고만 (분석은 계속)
    if skip_date_gap and len(df) < 2:
        warnings.append({"level": "warning", "msg": f"데이터가 {len(df)}행으로 부족합니다"})

    if "close" in df.columns:
        before = len(df)
        df = df[pd.to_numeric(df["close"], errors='coerce') >= 0]
        removed = before - len(df)
        if removed > 0:
            removed_rows += removed
            warnings.append({"level": "warning", "msg": f"음수 가격 {removed}행 제거"})

    if "date" in df.columns:
        today = datetime.today().strftime('%Y-%m-%d')
        before = len(df)
        df = df[df["date"] <= today]
        removed = before - len(df)
        if removed > 0:
            removed_rows += removed
            warnings.append({"level": "warning", "msg": f"미래 날짜 {removed}행 제거"})

    dup_cols = [c for c in ["date", "ticker"] if c in df.columns]
    if dup_cols:
        before = len(df)
        df = df.drop_duplicates(subset=dup_cols, keep='last')
        removed = before - len(df)
        if removed > 0:
            warnings.append({"level": "info", "msg": f"중복 날짜 {removed}행 제거 (마지막 값 유지)"})

    # 재무제표는 날짜 갭 체크 스킵
    if not skip_date_gap and "date" in df.columns and len(df) > 1:
        dates = pd.to_datetime(df["date"]).sort_values()
        gaps = dates.diff().dt.days.dropna()
        max_gap = gaps.max()
        if max_gap >= 5:
            warnings.append({"level": "warning", "msg": f"날짜 갭 최대 {int(max_gap)}일 감지 (영업일 기준 확인 필요)"})

    if "weight" in df.columns:
        total = df["weight"].sum()
        if abs(total - 100) > 1:
            df["weight"] = df["weight"] / total * 100
            warnings.append({"level": "info", "msg": f"비중 합계 {total:.1f}% → 자동 정규화 완료"})

    return {
        "df": df,
        "warnings": warnings,
        "removed_rows": removed_rows,
        "row_count": len(df)
    }
