"""
EcoSense AI — Custom Exception Handler.

Wraps all DRF API responses in the standard envelope format:
{
    "data": {},
    "meta": {},
    "error": null | { "code": "...", "message": "...", "details": {} }
}
"""

from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Custom exception handler that wraps errors in the standard API envelope.

    All API endpoints MUST return responses in the format:
    { "data": {}, "meta": {}, "error": null }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_data = {
            "code": response.status_code,
            "message": "",
            "details": {},
        }

        # Extract error message
        if isinstance(response.data, dict):
            if "detail" in response.data:
                error_data["message"] = str(response.data["detail"])
                error_data["details"] = {}
            else:
                error_data["message"] = "Validation error."
                error_data["details"] = response.data
        elif isinstance(response.data, list):
            error_data["message"] = "; ".join(str(e) for e in response.data)
        else:
            error_data["message"] = str(response.data)

        response.data = {
            "data": None,
            "meta": {},
            "error": error_data,
        }

    return response
