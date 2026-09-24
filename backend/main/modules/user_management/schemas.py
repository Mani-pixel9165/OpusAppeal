from main.common.errors import AppError
from main.modules.auth.schemas import normalize_email, require_fields


def create_user_payload(payload):
    require_fields(payload, ["first_name", "last_name", "username", "email"])
    password = payload.get("temporary_password", "")
    if password and len(password) < 6:
        raise AppError("Temporary password must be at least 6 characters.", 422)
    return {
        "first_name": payload["first_name"].strip(),
        "middle_name": payload.get("middle_name", "").strip() or None,
        "last_name": payload["last_name"].strip(),
        "username": payload["username"].strip().lower(),
        "email": normalize_email(payload["email"]),
        "temporary_password": password,
    }
