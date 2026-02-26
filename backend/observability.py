"""
Langfuse observability — lazy singleton, no-op when keys are not set.

Usage:
    from backend.observability import get_langfuse
    lf = get_langfuse()
    if lf:
        trace = lf.trace(name="my-op", ...)
"""
import logging

logger = logging.getLogger(__name__)

_client = None
_initialized = False


def get_langfuse():
    """Return the Langfuse client, or None if keys are not configured."""
    global _client, _initialized
    if _initialized:
        return _client

    _initialized = True
    try:
        from backend.config import settings
        if not settings.LANGFUSE_PUBLIC_KEY or not settings.LANGFUSE_SECRET_KEY:
            logger.info("[OBSERVABILITY] Langfuse keys not set — observability disabled.")
            return None

        from langfuse import Langfuse
        host = settings.LANGFUSE_BASE_URL or settings.LANGFUSE_HOST
        _client = Langfuse(
            public_key=settings.LANGFUSE_PUBLIC_KEY,
            secret_key=settings.LANGFUSE_SECRET_KEY,
            host=host,
        )
        logger.info("[OBSERVABILITY] Langfuse initialized → %s", settings.LANGFUSE_HOST)
    except Exception as e:
        logger.warning("[OBSERVABILITY] Failed to initialize Langfuse: %s", e)
        _client = None

    return _client
