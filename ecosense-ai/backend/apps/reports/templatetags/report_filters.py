import hashlib
from django import template

register = template.Library()


@register.filter(name='hash')
def hash_string(value):
    """Returns a truncated SHA-256 hash of the input string for audit trail display."""
    if not value:
        return ""
    try:
        return hashlib.sha256(str(value).encode('utf-8')).hexdigest()[:16].upper()
    except Exception:
        return "HASH_ERROR"


@register.filter(name='multiply')
def multiply(value, arg):
    """Multiply value by arg. Usage: {{ score|multiply:100 }}"""
    try:
        return float(value) * float(arg)
    except (TypeError, ValueError):
        return value


@register.filter(name='divide')
def divide(value, arg):
    """Divide value by arg safely. Usage: {{ total|divide:count }}"""
    try:
        arg = float(arg)
        if arg == 0:
            return 0
        return float(value) / arg
    except (TypeError, ValueError):
        return value


@register.filter(name='percentage')
def percentage(value, total):
    """Return value as a percentage of total. Usage: {{ count|percentage:total }}"""
    try:
        total = float(total)
        if total == 0:
            return 0
        return round(float(value) / total * 100, 1)
    except (TypeError, ValueError):
        return 0


@register.filter(name='default_if_none')
def default_if_none(value, default="—"):
    """Return default string when value is None. Usage: {{ value|default_if_none:'N/A' }}"""
    if value is None:
        return default
    return value


@register.filter(name='grade_color')
def grade_color(grade):
    """Return a CSS colour class for a compliance grade letter."""
    mapping = {
        'A': 'text-green-600',
        'B': 'text-emerald-600',
        'C': 'text-amber-500',
        'D': 'text-orange-600',
        'F': 'text-red-600',
    }
    return mapping.get(str(grade).upper(), 'text-gray-500')


@register.filter(name='severity_label')
def severity_label(value):
    """Convert severity float to a human-readable label."""
    try:
        v = float(value)
        if v >= 0.8:
            return "Critical"
        elif v >= 0.6:
            return "High"
        elif v >= 0.4:
            return "Moderate"
        elif v >= 0.2:
            return "Low"
        return "Negligible"
    except (TypeError, ValueError):
        return str(value)
