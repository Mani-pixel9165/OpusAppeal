import secrets
import string
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from flask import current_app, g
from flask_httpauth import HTTPTokenAuth

from main.common.errors import AppError

token_auth = HTTPTokenAuth(scheme="Bearer")


class PasswordManager:
    @staticmethod
    def hash_password(password):
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    @staticmethod
    def verify_password(password, hashed_password):
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))

    @staticmethod
    def validate(password):
        errors = []
        if len(password or "") < 8:
            errors.append("Password must be at least 8 characters.")
        if not any(char.isupper() for char in password or ""):
            errors.append("Password must include an uppercase letter.")
        if not any(char.islower() for char in password or ""):
            errors.append("Password must include a lowercase letter.")
        if not any(char.isdigit() for char in password or ""):
            errors.append("Password must include a number.")
        if not any(char in string.punctuation for char in password or ""):
            errors.append("Password must include a special character.")
        if errors:
            raise AppError("Password does not meet security requirements.", 422, errors)

    @staticmethod
    def generate(length=14):
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        while True:
            password = "".join(secrets.choice(alphabet) for _ in range(length))
            try:
                PasswordManager.validate(password)
                return password
            except AppError:
                continue


class TokenManager:
    @staticmethod
    def create_token(user):
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user.id),
            "role": user.role,
            "organization_id": user.organization_id,
            "iat": now,
            "exp": now + timedelta(minutes=current_app.config["JWT_EXPIRATION_MINUTES"]),
        }
        return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm=current_app.config["JWT_ALGORITHM"])

    @staticmethod
    def decode_token(token):
        try:
            return jwt.decode(
                token,
                current_app.config["JWT_SECRET_KEY"],
                algorithms=[current_app.config["JWT_ALGORITHM"]],
            )
        except jwt.ExpiredSignatureError as exc:
            raise AppError("Session expired. Please log in again.", 401) from exc
        except jwt.InvalidTokenError as exc:
            raise AppError("Invalid authentication token.", 401) from exc


@token_auth.verify_token
def verify_token(token):
    from main.modules.auth.models import User

    payload = TokenManager.decode_token(token)
    user = db_user = User.query.get(int(payload["sub"]))
    if not db_user or not user.is_active:
        return None
    g.current_user = user
    return user
