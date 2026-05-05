from fastapi import APIRouter
from pydantic import BaseModel
from app.services.insight_engine import generate_insight

router = APIRouter(prefix="/insight", tags=["insight"])

class InsightRequest(BaseModel):
    metrics: dict
    role: str
    data_type: str = "unknown"

@router.post("/")
def get_insight(req: InsightRequest):
    """Skills.md 트리거 조건 기반 Claude AI 인사이트 생성"""
    insight = generate_insight(req.metrics, req.role, req.data_type)
    return {
        "role": req.role,
        "insight": insight
    }
