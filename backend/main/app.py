import sys

from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate

from main.common.errors import register_error_handlers
from main.common.responses import api_response
from main.config.settings import Config
from main.cli import seed
from main.database.extensions import db
from main.modules.auth.routes import auth_bp
from main.modules.appeals.routes import appeals_bp
from main.modules.code_descriptions.routes import code_descriptions_bp
from main.modules.code_descriptions.scheduler import start_code_description_scheduler
from main.modules.code_descriptions.service import CodeDescriptionService
from main.modules.denials.routes import denials_bp
from main.modules.user_management.routes import user_management_bp

migrate = Migrate()


def is_migration_command():
    return "db" in sys.argv or "seed" in sys.argv


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}}, supports_credentials=True)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_management_bp, url_prefix="/api/users")
    app.register_blueprint(denials_bp, url_prefix="/api/denials")
    app.register_blueprint(appeals_bp, url_prefix="/api/appeals")
    app.register_blueprint(code_descriptions_bp, url_prefix="/api/code-descriptions")
    register_error_handlers(app)
    app.cli.add_command(seed)
    if not is_migration_command():
        with app.app_context():
            CodeDescriptionService.delete_interrupted_runs()
        start_code_description_scheduler(app)

    @app.get("/api/health")
    def health_check():
        return api_response(message="Opus Appeal Tracker Flow API is healthy")

    return app
