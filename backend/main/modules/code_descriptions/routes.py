from datetime import datetime

from flask import Blueprint, request

from main.common.responses import api_response
from main.modules.auth.utils import require_admin
from main.modules.code_descriptions.service import CodeDescriptionService

code_descriptions_bp = Blueprint("code_descriptions", __name__)


def parse_date_param(name):
    value = request.args.get(name)
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()


@code_descriptions_bp.get("/logs")
@require_admin
def extraction_logs():
    logs = CodeDescriptionService.list_logs(
        code_type=request.args.get("code_type"),
        date_from=parse_date_param("from"),
        date_to=parse_date_param("to"),
    )
    return api_response(data={"logs": logs})


@code_descriptions_bp.get("/status")
@require_admin
def extraction_status():
    return api_response(data={"status": CodeDescriptionService.status()})


@code_descriptions_bp.post("/run/<code_type>")
@require_admin
def run_extraction(code_type):
    log = CodeDescriptionService.run_extraction(code_type, run_label="Manual")
    return api_response(message="Extraction started.", data={"log": log})
