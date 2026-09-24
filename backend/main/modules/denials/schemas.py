from main.common.errors import AppError
from main.modules.auth.schemas import require_fields
from main.modules.denials.utils import parse_date


def assignment_payload(payload):
    require_fields(payload, ["user_id"])
    try:
        return {"user_id": int(payload["user_id"])}
    except (TypeError, ValueError) as exc:
        raise AppError("Select a valid assignee.", 422) from exc


def action_payload(payload):
    require_fields(payload, ["action_id"])
    try:
        action_id = int(payload["action_id"])
    except (TypeError, ValueError) as exc:
        raise AppError("Select a valid action.", 422) from exc

    return {
        "action_id": action_id,
        "other_description": str(payload.get("other_description") or "").strip(),
        "notes": str(payload.get("notes") or "").strip(),
    }


def create_action_payload(payload):
    require_fields(payload, ["name"])
    return {"name": str(payload.get("name") or "").strip()}


RULE_FIELDS = ["payer", "practice", "procedure", "modifier", "reason", "remark"]


def assignment_rule_payload(payload):
    require_fields(payload, ["assigned_to_id", "criteria"])
    try:
        assigned_to_id = int(payload["assigned_to_id"])
    except (TypeError, ValueError) as exc:
        raise AppError("Select a valid rule assignee.", 422) from exc

    criteria = payload.get("criteria") or {}
    clean_criteria = {}
    for field in RULE_FIELDS:
        value = criteria.get(field, [])
        if value is None:
            value = []
        if not isinstance(value, list):
            raise AppError(f"{field} must be a list.", 422)
        clean_criteria[field] = [str(item).strip() for item in value if str(item).strip()]

    effective_from = parse_date(payload.get("effective_from"))
    return {"assigned_to_id": assigned_to_id, "criteria": clean_criteria, "effective_from": effective_from}
