from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from app.services.insight_engine import generate_insight

router = APIRouter(prefix="/insight", tags=["insight"])

class ExtraContext(BaseModel):
    text_analysis: Optional[Dict[str, str]] = None
    extra_numeric: Optional[Dict[str, Any]] = None
    file_summary: Optional[str] = None
    anomalies: Optional[List[str]] = None

class InsightRequest(BaseModel):
    metrics: Dict[str, Any]
    role: str
    data_type: str = "unknown"
    extra_data: Optional[Dict[str, Any]] = None      # 기존 하위 호환
    extra_context: Optional[ExtraContext] = None      # 신규: 파일 전체 분석 결과

@router.post("/")
def get_insight(req: InsightRequest):
    if req.role not in ["stock", "fund", "financial", "analyst"]:
        raise HTTPException(status_code=400, detail="role은 stock/fund/financial/analyst 중 하나여야 합니다")

    extra_context_dict = req.extra_context.dict() if req.extra_context else None

    insight = generate_insight(
        metrics=req.metrics,
        role=req.role,
        data_type=req.data_type,
        extra_data=req.extra_data,
        extra_context=extra_context_dict,
    )

    return {"role": req.role, "insight": insight}