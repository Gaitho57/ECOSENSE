"""
EcoSense AI — Core Package Init.

This ensures the Celery app is always imported when Django starts,
so that @shared_task decorators use this app instance.
"""

from core.celery import app as celery_app

# --- CRITICAL MONKEYPATCH FOR WEASYPRINT/PYDYF COMPATIBILITY ---
try:
    import pydyf
    original_pydyf_init = pydyf.PDF.__init__
    def patched_pydyf_init(self, version='1.7', identifier=None):
        try:
            original_pydyf_init(self, version=version, identifier=identifier)
        except TypeError:
            original_pydyf_init(self)
    pydyf.PDF.__init__ = patched_pydyf_init
except ImportError:
    pass
# ---------------------------------------------------------------

__all__ = ("celery_app",)
