from sqlalchemy import or_

from main.common.errors import AppError
from main.common.security import PasswordManager
from main.database.extensions import db
from main.modules.auth.models import User
from main.modules.user_management.utils import resolve_temporary_password


class UserManagementService:
    @staticmethod
    def list_users(admin_user):
        users = (
            User.query.filter_by(organization_id=admin_user.organization_id)
            .order_by(User.created_at.desc())
            .all()
        )
        return [user.to_dict() for user in users]

    @staticmethod
    def create_user(admin_user, data):
        if User.query.filter(or_(User.email == data["email"], User.username == data["username"])).first():
            raise AppError("Email or username already exists.", 409)

        temporary_password = resolve_temporary_password(data["username"], data.get("temporary_password"))
        user = User(
            organization_id=admin_user.organization_id,
            email=data["email"],
            username=data["username"],
            first_name=data["first_name"],
            middle_name=data.get("middle_name"),
            last_name=data["last_name"],
            password_hash=PasswordManager.hash_password(temporary_password),
            role="user",
            first_login_required=True,
        )
        db.session.add(user)
        db.session.commit()
        return {"user": user.to_dict(), "temporary_password": temporary_password}
