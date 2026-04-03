import logging
import time
from datetime import datetime, timezone
from functools import wraps

logger = logging.getLogger(__name__)

def retry_api_call(max_retries=3, delay=2):
    """
    Decorator to retry external API calls on failure.
    Catch exceptions, log them, wait `delay` seconds, and retry.
    After `max_retries`, returns a fallback dictionary.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries):
                try:
                    data = func(*args, **kwargs)
                    return {
                        "source": args[0].__class__.__name__,
                        "data": data,
                        "retrieved_at": datetime.now(timezone.utc).isoformat()
                    }
                except Exception as e:
                    last_error = e
                    logger.warning(
                        f"Attempt {attempt + 1}/{max_retries} failed for "
                        f"{args[0].__class__.__name__}: {str(e)}"
                    )
                    if attempt < max_retries - 1:
                        time.sleep(delay)
            
            logger.error(f"All {max_retries} attempts failed. Last error: {str(last_error)}")
            return {
                "source": args[0].__class__.__name__,
                "data": None,
                "error": str(last_error),
                "retrieved_at": datetime.now(timezone.utc).isoformat()
            }
        return wrapper
    return decorator
