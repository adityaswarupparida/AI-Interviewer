from celery import Celery

from backend.config import settings

celery_app = Celery(
    "ai_intrvwr",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["backend.tasks.evaluate"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,          # only ack after task completes (safer retries)
    worker_prefetch_multiplier=1, # one task at a time per worker (LLM tasks are heavy)
)
