from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import pandas as pd
from app.services.calculator import calculate_by_role

router = APIRouter(prefix="/analyze", tags=["analyze"])

class AnalyzeRequest(BaseModel):
    data: List[Dict[str, Any]]
    role: str  # stock / fund / financial / analyst
    bm_returns: List[float] = []

@router.post("/")
def analyze(req: AnalyzeRequest):
    """파싱된 데이터 + 직군 → 지표 계산"""
    if not req.data:
        raise HTTPException(status_code=400, detail="데이터가 없습니다")
    if req.role not in ["stock", "fund", "financial", "analyst"]:
        raise HTTPException(status_code=400, detail="role은 stock/fund/financial/analyst 중 하나여야 합니다")

    df = pd.DataFrame(req.data)
    result = calculate_by_role(df, req.role, req.bm_returns)

    return {
        "role": req.role,
        "row_count": len(df),
        "metrics": result
    }
