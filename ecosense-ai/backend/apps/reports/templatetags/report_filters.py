import hashlib
from django import template

register = template.Library()

@register.filter(name='hash')
def hash_string(value):
    """
    Returns a truncated SHA-256 hash of the input string.
    Used for audit trail display in reports.
    """
    if not value:
        return ""
    try:
        return hashlib.sha256(str(value).encode('utf-8')).hexdigest()[:16].upper()
    except Exception:
        return "HASH_ERROR"
