from functools import wraps

from flask import g

from main.common.errors import AppError
from main.common.security import token_auth


def require_auth(fn):
    return token_auth.login_required(fn)


def require_admin(fn):
    @wraps(fn)
    @token_auth.login_required
    def wrapper(*args, **kwargs):
        if g.current_user.role != "admin":
            raise AppError("Admin access is required.", 403)
        return fn(*args, **kwargs)

    return wrapper

