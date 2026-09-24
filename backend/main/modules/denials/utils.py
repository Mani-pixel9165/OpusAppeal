from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

from main.common.errors import AppError

REQUIRED_COLUMNS = [
    "Patient",
    "Claim ID",
    "Service Date",
    "Billed Amt",
    "Payment Amt",
    "Payer",
    "Provider",
    "Practice",
    "Procedure",
    "Modifier",
    "Reason",
    "Remark",
    "Assigned To",
    "EOB Date",
    "Notes",
    "Date Added",
]


def normalize_header(value):
    return " ".join(str(value or "").strip().lower().split())


def parse_date(value):
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)) and value > 1:
        return datetime(1899, 12, 30).date() + timedelta(days=int(value))
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%m-%d-%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            continue
    raise AppError(f"Invalid date value: {value}", 422)


def parse_service_dates(value):
    if value in (None, ""):
        return None, None
    if isinstance(value, (datetime, date, int, float)):
        parsed = parse_date(value)
        return parsed, parsed.strftime("%m/%d/%Y") if parsed else None

    raw_value = str(value).strip()
    parts = [part.strip() for part in raw_value.split(",") if part.strip()]
    if len(parts) > 1:
        parsed_dates = []
        for part in parts:
            try:
                parsed_dates.append(parse_date(part))
            except AppError as exc:
                raise AppError(
                    f"Could not convert Service Date value '{part}'. Use a valid date for each DOS value.",
                    422,
                ) from exc
        sorted_dates = sorted(parsed_dates)
        display_start = sorted_dates[0].strftime("%m/%d/%Y")
        display_end = sorted_dates[-1].strftime("%m/%d/%Y")
        return sorted_dates[0], f"{display_start} - {display_end}"

    try:
        parsed = parse_date(raw_value)
        return parsed, parsed.strftime("%m/%d/%Y")
    except AppError as exc:
        raise AppError(
            f"Could not convert Service Date value '{raw_value}'. Use one valid DOS date, or comma-separated dates.",
            422,
        ) from exc


def parse_decimal(value):
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value).replace(",", "").replace("$", "").strip())
    except InvalidOperation as exc:
        raise AppError(f"Invalid amount value: {value}", 422) from exc


def validate_headers(headers):
    normalized = {normalize_header(header) for header in headers}
    missing = [column for column in REQUIRED_COLUMNS if normalize_header(column) not in normalized]
    if missing:
        raise AppError("Upload file is missing required columns.", 422, missing)
