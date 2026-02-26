"""
Metrics endpoint — receives frontend-measured latency and logs it to Langfuse.
"""
import logging
from fastapi import APIRouter
from pydantic import BaseModel

from backend.observability import get_langfuse

router = APIRouter(prefix="/api/metrics", tags=["metrics"])
logger = logging.getLogger(__name__)


class LatencyEvent(BaseModel):
    interview_id: str
    latency_ms: int        # VAD stop → agent audio start (measured in browser)
    turn_index: int = 0


@router.post("/latency")
def record_latency(event: LatencyEvent):
    logger.info(
        "[METRICS] interview=%s turn=%d latency=%dms",
        event.interview_id, event.turn_index, event.latency_ms,
    )
    lf = get_langfuse()
    if lf:
        lf.score(
            trace_id=event.interview_id,
            name="turn_latency_ms",
            value=event.latency_ms,
            comment=f"Turn {event.turn_index} — VAD stop to agent audio (browser-measured)",
        )
    return {"ok": True}
