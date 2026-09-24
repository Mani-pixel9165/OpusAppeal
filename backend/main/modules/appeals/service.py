from pathlib import Path
from uuid import uuid4

from werkzeug.utils import secure_filename

from main.common.errors import AppError
from main.database.extensions import db
from main.modules.appeals.models import (
    AppealLetterTemplate,
    AppealPackage,
    AppealPackageDocument,
    AppealPackageLetter,
)
from main.modules.denials.models import Denial
from main.modules.denials.service import DenialService


UPLOAD_DIR = Path("instance") / "appeal_uploads"


class AppealStorageService:
    @staticmethod
    def list_templates(user):
        templates = AppealLetterTemplate.query.filter_by(organization_id=user.organization_id).order_by(
            AppealLetterTemplate.updated_at.desc()
        ).all()
        return [template.to_dict() for template in templates]

    @staticmethod
    def save_template(user, data):
        name = str(data.get("name") or "").strip() or "Untitled Template"
        content = str(data.get("content") or "")
        template_id = data.get("id")
        template = None
        if template_id and str(template_id).isdigit():
            template = AppealLetterTemplate.query.filter_by(
                id=int(template_id),
                organization_id=user.organization_id,
            ).first()
        if not template:
            template = AppealLetterTemplate.query.filter_by(
                organization_id=user.organization_id,
                name=name,
            ).first()
        if template:
            template.name = name
            template.content = content
        else:
            template = AppealLetterTemplate(
                organization_id=user.organization_id,
                name=name,
                content=content,
                created_by_id=user.id,
            )
            db.session.add(template)
        db.session.commit()
        return template.to_dict()

    @staticmethod
    def delete_template(user, template_id):
        template = AppealLetterTemplate.query.filter_by(
            id=template_id,
            organization_id=user.organization_id,
        ).first()
        if not template:
            raise AppError("Template not found.", 404)
        AppealPackageLetter.query.filter_by(template_id=template.id).update({"template_id": None})
        db.session.delete(template)
        db.session.commit()

    @staticmethod
    def upload_document(user, file_storage):
        if not file_storage:
            raise AppError("Choose a document to upload.", 422)
        original = secure_filename(file_storage.filename or "")
        if not original:
            raise AppError("Uploaded document must have a filename.", 422)
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        stored = f"{uuid4().hex}_{original}"
        path = UPLOAD_DIR / stored
        file_storage.save(path)
        return {
            "fileName": original,
            "storedFileName": stored,
            "filePath": str(path.as_posix()),
            "contentType": file_storage.mimetype,
            "fileSize": path.stat().st_size,
        }

    @staticmethod
    def save_package(user, denial_id, data):
        denial = DenialService._denial_for_user(user, denial_id)
        existing = AppealPackage.query.filter_by(denial_id=denial.id).first()
        if existing:
            db.session.delete(existing)
            db.session.flush()

        package = AppealPackage(
            organization_id=user.organization_id,
            denial_id=denial.id,
            created_by_id=user.id,
            form_data=data.get("form") or {},
        )
        db.session.add(package)
        db.session.flush()

        for index, letter in enumerate(data.get("letters") or []):
            template_id = letter.get("templateId")
            db.session.add(AppealPackageLetter(
                package_id=package.id,
                template_id=int(template_id) if str(template_id or "").isdigit() else None,
                sort_order=index,
                name=str(letter.get("name") or f"Letter {index + 1}"),
                template_name=str(letter.get("templateName") or letter.get("name") or ""),
                content=str(letter.get("content") or ""),
                pdf_html=str(letter.get("pdfHtml") or ""),
            ))

        for index, document in enumerate(data.get("documents") or []):
            file_path = str(document.get("filePath") or "").strip()
            if not file_path:
                continue
            db.session.add(AppealPackageDocument(
                package_id=package.id,
                sort_order=index,
                document_type=str(document.get("type") or "Other"),
                name=str(document.get("name") or "").strip() or None,
                original_filename=str(document.get("fileName") or ""),
                stored_filename=str(document.get("storedFileName") or ""),
                file_path=file_path,
                content_type=str(document.get("contentType") or "") or None,
                file_size=document.get("fileSize"),
            ))

        DenialService.complete_appeal(user, denial.id)
        db.session.commit()
        return package.to_dict()

    @staticmethod
    def list_packages(user):
        query = AppealPackage.query.filter_by(organization_id=user.organization_id)
        if user.role != "admin":
            query = query.join(Denial, AppealPackage.denial_id == Denial.id).filter(
                (Denial.assigned_to_id == user.id) | (Denial.assigned_to_id.is_(None))
            )
        return [package.to_dict() for package in query.order_by(AppealPackage.created_at.desc()).all()]
