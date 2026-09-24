def api_response(success=True, message="", data=None, errors=None):
    payload = {
        "success": success,
        "message": message,
        "data": data,
    }
    if errors:
        payload["errors"] = errors
    return payload

