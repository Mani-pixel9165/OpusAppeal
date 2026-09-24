from pathlib import Path

from flask import Blueprint, g, request, send_file

from main.common.errors import AppError
from main.common.responses import api_response
from main.modules.appeals.models import AppealPackageDocument
from main.modules.appeals.service import AppealStorageService
from main.modules.auth.utils import require_admin, require_auth

appeals_bp = Blueprint("appeals", __name__)


@appeals_bp.get("/templates")
@require_auth
def list_templates():
    return api_response(data={"templates": AppealStorageService.list_templates(g.current_user)})


@appeals_bp.post("/templates")
@require_admin
def save_template():
    result = AppealStorageService.save_template(g.current_user, request.get_json(silent=True) or {})
    return api_response(message="Template saved.", data={"template": result}), 201


@appeals_bp.delete("/templates/<int:template_id>")
@require_admin
def delete_template(template_id):
    AppealStorageService.delete_template(g.current_user, template_id)
    return api_response(message="Template deleted.")


@appeals_bp.post("/documents/upload")
@require_auth
def upload_document():
    result = AppealStorageService.upload_document(g.current_user, request.files.get("file"))
    return api_response(message="Document uploaded.", data={"document": result}), 201


@appeals_bp.get("/packages")
@require_auth
def list_packages():
    return api_response(data={"packages": AppealStorageService.list_packages(g.current_user)})


@appeals_bp.post("/packages/<int:denial_id>")
@require_auth
def save_package(denial_id):
    result = AppealStorageService.save_package(g.current_user, denial_id, request.get_json(silent=True) or {})
    return api_response(message="Appeal package saved.", data={"package": result}), 201


@appeals_bp.get("/documents/<int:document_id>/file")
@require_auth
def document_file(document_id):
    document = AppealPackageDocument.query.filter_by(id=document_id).first()
    if not document or document.package.organization_id != g.current_user.organization_id:
        raise AppError("Document not found.", 404)
    path = Path(document.file_path)
    if not path.exists():
        raise AppError("Document file is missing.", 404)
    return send_file(path, mimetype=document.content_type or "application/octet-stream", download_name=document.original_filename)
