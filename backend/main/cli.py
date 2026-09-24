import click
from sqlalchemy import or_

from main.common.security import PasswordManager
from main.database.extensions import db
from main.modules.auth.models import Organization, User


ADMIN_ORGANIZATION_NAME = "Opus BPO"
ADMIN_EMAIL = "Admin@opusbpo.com"
ADMIN_USERNAME = "Admin"
ADMIN_PASSWORD = "AdminUser@1234"


@click.group()
def seed():
    """Seed development data."""


@seed.command("admin")
def seed_admin():
    """Create or update the default admin login."""
    organization = Organization.query.filter(
        or_(
            db.func.lower(Organization.name) == ADMIN_ORGANIZATION_NAME.lower(),
            Organization.email == ADMIN_EMAIL,
        )
    ).first()

    if not organization:
        organization = Organization(name=ADMIN_ORGANIZATION_NAME, email=ADMIN_EMAIL)
        db.session.add(organization)
        db.session.flush()

    user = User.query.filter(or_(User.username == ADMIN_USERNAME, User.email == ADMIN_EMAIL)).first()
    if not user:
        user = User(organization=organization)
        db.session.add(user)

    user.organization = organization
    user.username = ADMIN_USERNAME
    user.email = ADMIN_EMAIL
    user.first_name = "Admin"
    user.middle_name = None
    user.last_name = "User"
    user.password_hash = PasswordManager.hash_password(ADMIN_PASSWORD)
    user.role = "admin"
    user.first_login_required = False
    user.is_active = True

    db.session.commit()
    click.echo(f"Seeded admin user: username={ADMIN_USERNAME}, email={ADMIN_EMAIL}")
