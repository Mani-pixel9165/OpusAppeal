from sqlalchemy import or_

from main.common.errors import AppError
from main.common.security import PasswordManager, TokenManager
from main.database.extensions import db
from main.modules.auth.models import Organization, User


class AuthService:
    @staticmethod
    def register_organization(data):
        PasswordManager.validate(data["password"])
        normalized_org = data["organization_name"].strip()

        if Organization.query.filter(db.func.lower(Organization.name) == normalized_org.lower()).first():
            raise AppError("Organization already exists.", 409)
        if Organization.query.filter_by(email=data["email"]).first():
            raise AppError("Organization email already exists.", 409)
        if User.query.filter(or_(User.email == data["email"], User.username == data["username"])).first():
            raise AppError("Email or username already exists.", 409)

        organization = Organization(name=normalized_org, email=data["email"])
        user = User(
            organization=organization,
            email=data["email"],
            username=data["username"],
            first_name=data["first_name"],
            middle_name=data.get("middle_name"),
            last_name=data["last_name"],
            password_hash=PasswordManager.hash_password(data["password"]),
            role="admin",
            first_login_required=False,
        )
        db.session.add(organization)
        db.session.add(user)
        db.session.commit()
        return {"organization": organization.to_dict(), "user": user.to_dict()}

    @staticmethod
    def login(data):
        user = User.query.filter(or_(User.email == data["identifier"], User.username == data["identifier"])).first()
        if not user or not PasswordManager.verify_password(data["password"], user.password_hash):
            raise AppError("Invalid login credentials.", 401)
        if not user.is_active:
            raise AppError("User account is inactive.", 403)

        token = TokenManager.create_token(user)
        return {
            "token": token,
            "user": user.to_dict(),
            "organization": user.organization.to_dict(),
            "first_login_required": user.first_login_required,
        }

    @staticmethod
    def update_first_login_password(user, data):
        PasswordManager.validate(data["password"])
        user.password_hash = PasswordManager.hash_password(data["password"])
        user.first_login_required = False
        db.session.commit()
        return user.to_dict()
