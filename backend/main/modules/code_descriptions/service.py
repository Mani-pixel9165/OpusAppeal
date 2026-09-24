import re
from datetime import date, datetime, time, timezone
from pathlib import Path
from threading import Lock

from openpyxl import Workbook

from main.common.errors import AppError
from main.database.extensions import db
from main.modules.code_descriptions.models import CodeDescription, CodeDescriptionExtractionLog


CODE_SOURCES = {
    "reason": {
        "label": "Reason Code Description Extraction",
        "url": "https://x12.org/codes/claim-adjustment-reason-codes",
        "sheet": "CARC Codes",
        "file": "Claim_Adjustment_Reason_Codes.xlsx",
    },
    "remark": {
        "label": "Remark Code Description Extraction",
        "url": "https://x12.org/codes/remittance-advice-remark-codes",
        "sheet": "RARC Codes",
        "file": "Remittance_Advice_Remark_Codes.xlsx",
    },
}

_RUN_LOCKS = {"reason": Lock(), "remark": Lock()}


def normalize_reason_code(code):
    text = str(code or "").strip().upper()
    match = re.search(r"(?:CO|PR|PI|OA)?-?(\d+)$", text)
    return match.group(1) if match else text


def normalize_remark_code(code):
    return str(code or "").strip().upper()


def normalize_code(code_type, code):
    return normalize_reason_code(code) if code_type == "reason" else normalize_remark_code(code)


def reason_lookup_codes(code):
    text = str(code or "").strip().upper()
    numeric = normalize_reason_code(text)
    if re.match(r"^(CO|PR|PI|OA)-?\d+$", text):
        prefixed = text if "-" in text else re.sub(r"^(CO|PR|PI|OA)(\d+)$", r"\1-\2", text)
        return [prefixed, numeric]
    return [numeric]


def extraction_reason_code(code, description):
    numeric = normalize_reason_code(code)
    match = re.search(r"Use only with Group Code\s+(CO|PR|PI|OA)\b", description or "", flags=re.IGNORECASE)
    return f"{match.group(1).upper()}-{numeric}" if match else numeric


def parse_us_date(value):
    if not value:
        return None
    return datetime.strptime(value, "%m/%d/%Y").date()


def parse_description_cell(text):
    raw_text = str(text or "").strip()
    start_match = re.search(r"Start:\s*(\d{2}/\d{2}/\d{4})", raw_text, flags=re.IGNORECASE)
    modified_match = re.search(r"Last Modified:\s*(\d{2}/\d{2}/\d{4})", raw_text, flags=re.IGNORECASE)
    description = re.split(r"\s*Start:\s*\d{2}/\d{2}/\d{4}", raw_text, maxsplit=1, flags=re.IGNORECASE)[0].strip()

    return {
        "description": description,
        "start_date": parse_us_date(start_match.group(1)) if start_match else None,
        "last_modified_at": parse_us_date(modified_match.group(1)) if modified_match else None,
    }


class CodeDescriptionService:
    @staticmethod
    def list_logs(code_type=None, date_from=None, date_to=None):
        query = CodeDescriptionExtractionLog.query
        if code_type in CODE_SOURCES:
            query = query.filter_by(code_type=code_type)
        if date_from:
            query = query.filter(CodeDescriptionExtractionLog.started_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
        if date_to:
            query = query.filter(CodeDescriptionExtractionLog.started_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))
        return [log.to_dict() for log in query.order_by(CodeDescriptionExtractionLog.started_at.desc()).all()]

    @staticmethod
    def status():
        running = {
            item.code_type: True
            for item in CodeDescriptionExtractionLog.query.filter_by(status="running").all()
        }
        return {
            code_type: {
                "label": source["label"],
                "running": bool(running.get(code_type)),
            }
            for code_type, source in CODE_SOURCES.items()
        }

    @staticmethod
    def delete_interrupted_runs():
        CodeDescriptionExtractionLog.query.filter_by(status="running").delete()
        db.session.commit()

    @staticmethod
    def description_map(code_type, codes):
        if code_type == "reason":
            normalized_codes = {
                lookup_code
                for code in codes
                for lookup_code in reason_lookup_codes(code)
                if lookup_code
            }
        else:
            normalized_codes = {normalize_code(code_type, code) for code in codes if str(code or "").strip()}
        if not normalized_codes:
            return {}
        rows = CodeDescription.query.filter(
            CodeDescription.code_type == code_type,
            CodeDescription.code.in_(normalized_codes),
        ).all()
        return {row.code: row.description for row in rows}

    @staticmethod
    def run_extraction(code_type, run_label="Daily"):
        if code_type not in CODE_SOURCES:
            raise AppError("Unsupported code description extraction type.", 422)

        lock = _RUN_LOCKS[code_type]
        if not lock.acquire(blocking=False):
            return None

        started_at = datetime.now(timezone.utc)
        log = CodeDescriptionExtractionLog(
            code_type=code_type,
            run_label=run_label,
            started_at=started_at,
            status="running",
            message="Extraction started.",
        )
        db.session.add(log)
        db.session.commit()

        try:
            previous_success = (
                CodeDescriptionExtractionLog.query
                .filter(
                    CodeDescriptionExtractionLog.code_type == code_type,
                    CodeDescriptionExtractionLog.status == "success",
                    CodeDescriptionExtractionLog.stopped_at.isnot(None),
                    CodeDescriptionExtractionLog.id != log.id,
                )
                .order_by(CodeDescriptionExtractionLog.stopped_at.desc())
                .first()
            )
            threshold = previous_success.stopped_at.date() if previous_success else None
            rows = CodeDescriptionService.scrape_codes(code_type)
            CodeDescriptionService.save_excel(code_type, rows)

            rows_appended = 0
            modified_updates = 0
            new_starts = 0

            existing_rows = {
                item.code: item
                for item in CodeDescription.query.filter_by(code_type=code_type).all()
            }

            for row in rows:
                start_is_new = bool(threshold and row["start_date"] and row["start_date"] > threshold)
                modified_is_new = bool(threshold and row["last_modified_at"] and row["last_modified_at"] > threshold)
                should_upsert = threshold is None or start_is_new or modified_is_new
                if not should_upsert:
                    continue

                if start_is_new:
                    new_starts += 1
                if modified_is_new:
                    modified_updates += 1

                existing = existing_rows.get(row["code"])
                if existing:
                    existing.description = row["description"]
                    existing.start_date = row["start_date"]
                    existing.last_modified_at = row["last_modified_at"]
                    existing.source_url = CODE_SOURCES[code_type]["url"]
                else:
                    existing = CodeDescription(
                        code_type=code_type,
                        code=row["code"],
                        description=row["description"],
                        start_date=row["start_date"],
                        last_modified_at=row["last_modified_at"],
                        source_url=CODE_SOURCES[code_type]["url"],
                    )
                    existing_rows[row["code"]] = existing
                    db.session.add(existing)
                rows_appended += 1

            log.status = "success"
            log.rows_seen = len(rows)
            log.modified_updates = modified_updates
            log.new_starts = new_starts
            log.rows_appended = rows_appended
            log.message = f"{rows_appended} rows appended or updated."
        except Exception as exc:
            log.status = "failure"
            log.message = str(exc)
        finally:
            log.stopped_at = datetime.now(timezone.utc)
            db.session.commit()
            lock.release()

        return log.to_dict()

    @staticmethod
    def scrape_codes(code_type):
        from playwright.sync_api import sync_playwright

        source = CODE_SOURCES[code_type]
        rows_data = []

        with sync_playwright() as playwright:
            try:
                browser = playwright.chromium.launch(channel="chrome", headless=True)
            except Exception:
                try:
                    browser = playwright.chromium.launch(channel="msedge", headless=True)
                except Exception:
                    browser = playwright.chromium.launch(headless=True, args=["--disable-gpu"])
            page = browser.new_page()
            page.goto(source["url"], wait_until="domcontentloaded", timeout=120000)
            page.wait_for_selector("#codelist", timeout=120000)
            page.wait_for_timeout(1000)
            rows = page.locator("#codelist tr.prod-set.current").evaluate_all(
                """rows => rows.map(row => ({
                    code: row.querySelector('td.code')?.innerText?.trim() || '',
                    description: row.querySelector('td.description')?.innerText?.trim() || ''
                }))"""
            )

            for row in rows:
                metadata = parse_description_cell(row["description"])
                code = extraction_reason_code(row["code"], metadata["description"]) if code_type == "reason" else normalize_code(code_type, row["code"])
                if code and metadata["description"]:
                    rows_data.append({"code": code, **metadata})

            browser.close()

        return rows_data

    @staticmethod
    def save_excel(code_type, rows):
        source = CODE_SOURCES[code_type]
        output_dir = Path("instance") / "code_descriptions"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / source["file"]

        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = source["sheet"]
        worksheet.append(["Code", "Description", "Start Date", "Last Modified"])

        for row in rows:
            worksheet.append([
                row["code"],
                row["description"],
                row["start_date"].isoformat() if row["start_date"] else "",
                row["last_modified_at"].isoformat() if row["last_modified_at"] else "",
            ])

        for column_cells in worksheet.columns:
            length = max(len(str(cell.value)) if cell.value else 0 for cell in column_cells)
            worksheet.column_dimensions[column_cells[0].column_letter].width = min(length + 5, 100)

        workbook.save(output_path)
