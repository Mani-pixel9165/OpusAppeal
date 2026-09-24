from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from main.common.responses import api_response


class AppError(Exception):
    def __init__(self, message, status_code=400, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


def register_error_handlers(app):
    @app.errorhandler(AppError)
    def handle_app_error(error):
        return api_response(False, error.message, None, error.details), error.status_code

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return api_response(False, error.description), error.code

    @app.errorhandler(OperationalError)
    def handle_database_connection_error(error):
        app.logger.exception(error)
        return api_response(
            False,
            "Database connection failed. Check PostgreSQL is running and appealio.env has the correct database values.",
        ), 500

    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(error):
        app.logger.exception(error)
        return api_response(False, "Database operation failed. Check migrations and database configuration."), 500

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.exception(error)
        return api_response(False, "An unexpected error occurred"), 500
