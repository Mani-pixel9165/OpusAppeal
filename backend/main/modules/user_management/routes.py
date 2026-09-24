from flask import Blueprint, g, request

from main.common.responses import api_response
from main.modules.auth.utils import require_admin
from main.modules.user_management.schemas import create_user_payload
from main.modules.user_management.service import UserManagementService

user_management_bp = Blueprint("user_management", __name__)


@user_management_bp.get("")
@require_admin
def list_users():
    return api_response(data={"users": UserManagementService.list_users(g.current_user)})


@user_management_bp.post("")
@require_admin
def create_user():
    data = create_user_payload(request.get_json(silent=True) or {})
    result = UserManagementService.create_user(g.current_user, data)
    return api_response(message="User created successfully.", data=result), 201

