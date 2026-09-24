from flask import Blueprint, g, request

from main.common.responses import api_response
from main.modules.auth.utils import require_admin, require_auth
from main.modules.denials.schemas import action_payload, assignment_payload, assignment_rule_payload, create_action_payload
from main.modules.denials.service import DenialService

denials_bp = Blueprint("denials", __name__)


@denials_bp.get("/pending")
@require_auth
def pending_denials():
    return api_response(data={"denials": DenialService.list_pending(g.current_user)})


@denials_bp.get("/in-process")
@require_auth
def in_process_denials():
    return api_response(data={"denials": DenialService.list_in_process(g.current_user)})


@denials_bp.get("/completed")
@require_auth
def completed_denials():
    return api_response(data={"denials": DenialService.list_completed(g.current_user)})


@denials_bp.patch("/<int:denial_id>/appeal/start")
@require_auth
def start_appeal(denial_id):
    result = DenialService.start_appeal(g.current_user, denial_id)
    return api_response(message="Appeal process started.", data={"denial": result})


@denials_bp.patch("/<int:denial_id>/appeal/stage")
@require_auth
def update_appeal_stage(denial_id):
    result = DenialService.update_appeal_stage(g.current_user, denial_id, (request.get_json(silent=True) or {}).get("stage"))
    return api_response(message="Appeal stage updated.", data={"denial": result})


@denials_bp.patch("/<int:denial_id>/appeal/remove")
@require_auth
def remove_appeal(denial_id):
    result = DenialService.remove_appeal(g.current_user, denial_id)
    return api_response(message="Appeal removed.", data={"denial": result})


@denials_bp.patch("/<int:denial_id>/appeal/complete")
@require_auth
def complete_appeal(denial_id):
    result = DenialService.complete_appeal(g.current_user, denial_id)
    return api_response(message="Appeal completed.", data={"denial": result})


@denials_bp.get("/actions")
@require_auth
def denial_actions():
    return api_response(data={"actions": DenialService.list_actions()})


@denials_bp.post("/actions")
@require_admin
def create_denial_action():
    result = DenialService.create_action(g.current_user, create_action_payload(request.get_json(silent=True) or {}))
    return api_response(message="Action created successfully.", data={"action": result}), 201


@denials_bp.patch("/<int:denial_id>/action/assign")
@require_auth
def assign_action(denial_id):
    result = DenialService.assign_action(g.current_user, denial_id, action_payload(request.get_json(silent=True) or {}))
    return api_response(message="Action assigned successfully.", data={"denial": result})


@denials_bp.patch("/<int:denial_id>/action/remove")
@require_auth
def remove_action(denial_id):
    result = DenialService.remove_action(g.current_user, denial_id)
    return api_response(message="Action removed.", data={"denial": result})


@denials_bp.patch("/<int:denial_id>/action/complete")
@require_auth
def complete_action(denial_id):
    result = DenialService.complete_action(g.current_user, denial_id)
    return api_response(message="Action completed.", data={"denial": result})


@denials_bp.post("/upload")
@require_admin
def upload_denials():
    result = DenialService.upload_excel(g.current_user, request.files.get("file"))
    return api_response(message="Denials uploaded successfully.", data=result), 201


@denials_bp.post("/upload/preview")
@require_admin
def preview_upload():
    result = DenialService.preview_excel(g.current_user, request.files.get("file"))
    return api_response(message="Upload preview ready.", data=result)


@denials_bp.patch("/<int:denial_id>/assign")
@require_admin
def assign_denial(denial_id):
    data = assignment_payload(request.get_json(silent=True) or {})
    result = DenialService.assign_denial(g.current_user, denial_id, data["user_id"])
    return api_response(message="Denial assigned successfully.", data={"denial": result})


@denials_bp.get("/assignment-rules")
@require_auth
def assignment_rules():
    return api_response(data={"rules": DenialService.list_assignment_rules(g.current_user)})


@denials_bp.post("/assignment-rules")
@require_admin
def create_assignment_rule():
    data = assignment_rule_payload(request.get_json(silent=True) or {})
    result = DenialService.create_assignment_rule(g.current_user, data)
    return api_response(message="Assignment rule created successfully.", data=result), 201


@denials_bp.patch("/assignment-rules/<int:rule_id>")
@require_admin
def update_assignment_rule(rule_id):
    data = assignment_rule_payload(request.get_json(silent=True) or {})
    result = DenialService.update_assignment_rule(g.current_user, rule_id, data)
    return api_response(message="Assignment rule updated successfully.", data={"rule": result})


@denials_bp.patch("/assignment-rules/<int:rule_id>/deactivate")
@require_admin
def deactivate_assignment_rule(rule_id):
    result = DenialService.deactivate_assignment_rule(g.current_user, rule_id)
    return api_response(message="Assignment rule deactivated.", data={"rule": result})
