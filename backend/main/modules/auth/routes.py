from flask import Blueprint, g, request

from main.common.responses import api_response
from main.modules.auth.schemas import login_payload, password_update_payload, registration_payload
from main.modules.auth.service import AuthService
from main.modules.auth.utils import require_auth

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    data = registration_payload(request.get_json(silent=True) or {})
    result = AuthService.register_organization(data)
    return api_response(message="Organization registered successfully.", data=result), 201


@auth_bp.post("/login")
def login():
    data = login_payload(request.get_json(silent=True) or {})
    result = AuthService.login(data)
    return api_response(message="Login successful.", data=result)


@auth_bp.get("/me")
@require_auth
def me():
    return api_response(data={"user": g.current_user.to_dict(), "organization": g.current_user.organization.to_dict()})


@auth_bp.post("/update-password")
@require_auth
def update_password():
    data = password_update_payload(request.get_json(silent=True) or {})
    user = AuthService.update_first_login_password(g.current_user, data)
    return api_response(message="Password updated successfully. Please log in again.", data={"user": user})

