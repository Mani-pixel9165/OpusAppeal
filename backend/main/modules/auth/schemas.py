from email_validator import EmailNotValidError, validate_email

from main.common.errors import AppError


def require_fields(payload, fields):
    missing = [field for field in fields if not str(payload.get(field, "")).strip()]
    if missing:
        raise AppError("Required fields are missing.", 422, missing)


def normalize_email(email):
    try:
        return validate_email(email, check_deliverability=False).normalized.lower()
    except EmailNotValidError as exc:
        raise AppError("Enter a valid email address.", 422) from exc


def registration_payload(payload):
    require_fields(payload, ["organization_name", "first_name", "last_name", "email", "username", "password", "confirm_password"])
    if payload["password"] != payload["confirm_password"]:
        raise AppError("Passwords do not match.", 422)
    return {
        "organization_name": payload["organization_name"].strip(),
        "first_name": payload["first_name"].strip(),
        "middle_name": payload.get("middle_name", "").strip() or None,
        "last_name": payload["last_name"].strip(),
        "email": normalize_email(payload["email"]),
        "username": payload["username"].strip().lower(),
        "password": payload["password"],
    }


def login_payload(payload):
    require_fields(payload, ["identifier", "password"])
    return {"identifier": payload["identifier"].strip().lower(), "password": payload["password"]}


def password_update_payload(payload):
    require_fields(payload, ["password", "confirm_password"])
    if payload["password"] != payload["confirm_password"]:
        raise AppError("Passwords do not match.", 422)
    return {"password": payload["password"]}
