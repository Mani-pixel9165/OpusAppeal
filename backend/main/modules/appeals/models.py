from datetime import datetime, timezone

from main.database.extensions import db


class AppealLetterTemplate(db.Model):
    __tablename__ = "appeal_letter_templates"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False, default="")
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    created_by = db.relationship("User", foreign_keys=[created_by_id])

    __table_args__ = (
        db.UniqueConstraint("organization_id", "name", name="uq_appeal_letter_templates_org_name"),
    )

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "content": self.content,
            "created_by": self.created_by.to_dict() if self.created_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class AppealPackage(db.Model):
    __tablename__ = "appeal_packages"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=False, index=True)
    denial_id = db.Column(db.Integer, db.ForeignKey("denials.id"), nullable=False, index=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    form_data = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    denial = db.relationship("Denial", foreign_keys=[denial_id])
    created_by = db.relationship("User", foreign_keys=[created_by_id])
    letters = db.relationship("AppealPackageLetter", back_populates="package", cascade="all, delete-orphan", order_by="AppealPackageLetter.sort_order")
    documents = db.relationship("AppealPackageDocument", back_populates="package", cascade="all, delete-orphan", order_by="AppealPackageDocument.sort_order")

    __table_args__ = (
        db.UniqueConstraint("denial_id", name="uq_appeal_packages_denial_id"),
    )

    def to_dict(self):
        return {
            "id": f"appeal_package_{self.id}",
            "denialId": self.denial_id,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "denial": self.denial.to_dict() if self.denial else None,
            "form": self.form_data or {},
            "created_by": self.created_by.to_dict() if self.created_by else None,
            "letters": [letter.to_dict() for letter in self.letters],
            "documents": [document.to_dict() for document in self.documents],
        }


class AppealPackageLetter(db.Model):
    __tablename__ = "appeal_package_letters"

    id = db.Column(db.Integer, primary_key=True)
    package_id = db.Column(db.Integer, db.ForeignKey("appeal_packages.id"), nullable=False, index=True)
    template_id = db.Column(db.Integer, db.ForeignKey("appeal_letter_templates.id"), nullable=True, index=True)
    sort_order = db.Column(db.Integer, default=0, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    template_name = db.Column(db.String(255), nullable=True)
    content = db.Column(db.Text, nullable=False, default="")
    pdf_html = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    package = db.relationship("AppealPackage", back_populates="letters")
    template = db.relationship("AppealLetterTemplate", foreign_keys=[template_id])

    def to_dict(self):
        return {
            "id": f"letter_{self.id}",
            "name": self.name,
            "templateId": str(self.template_id) if self.template_id else "blank",
            "templateName": self.template_name or self.name,
            "content": self.content,
            "pdfHtml": self.pdf_html,
        }


class AppealPackageDocument(db.Model):
    __tablename__ = "appeal_package_documents"

    id = db.Column(db.Integer, primary_key=True)
    package_id = db.Column(db.Integer, db.ForeignKey("appeal_packages.id"), nullable=False, index=True)
    sort_order = db.Column(db.Integer, default=0, nullable=False)
    document_type = db.Column(db.String(80), nullable=False)
    name = db.Column(db.String(255), nullable=True)
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.Text, nullable=False)
    content_type = db.Column(db.String(160), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    package = db.relationship("AppealPackage", back_populates="documents")

    def to_dict(self):
        return {
            "id": f"document_{self.id}",
            "type": self.document_type,
            "name": self.name or "",
            "fileName": self.original_filename,
            "storedFileName": self.stored_filename,
            "filePath": self.file_path,
            "contentType": self.content_type,
            "fileSize": self.file_size,
        }
