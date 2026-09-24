from datetime import datetime, timezone

from main.database.extensions import db


class CodeDescription(db.Model):
    __tablename__ = "code_descriptions"

    id = db.Column(db.Integer, primary_key=True)
    code_type = db.Column(db.String(20), nullable=False, index=True)
    code = db.Column(db.String(40), nullable=False, index=True)
    description = db.Column(db.Text, nullable=False)
    start_date = db.Column(db.Date, nullable=True)
    last_modified_at = db.Column(db.Date, nullable=True)
    source_url = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        db.UniqueConstraint("code_type", "code", name="uq_code_descriptions_type_code"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "code_type": self.code_type,
            "code": self.code,
            "description": self.description,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "last_modified_at": self.last_modified_at.isoformat() if self.last_modified_at else None,
            "source_url": self.source_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CodeDescriptionExtractionLog(db.Model):
    __tablename__ = "code_description_extraction_logs"

    id = db.Column(db.Integer, primary_key=True)
    code_type = db.Column(db.String(20), nullable=False, index=True)
    run_label = db.Column(db.String(40), default="Daily", nullable=False)
    started_at = db.Column(db.DateTime(timezone=True), nullable=False)
    stopped_at = db.Column(db.DateTime(timezone=True), nullable=True)
    status = db.Column(db.String(20), default="running", nullable=False, index=True)
    rows_seen = db.Column(db.Integer, default=0, nullable=False)
    modified_updates = db.Column(db.Integer, default=0, nullable=False)
    new_starts = db.Column(db.Integer, default=0, nullable=False)
    rows_appended = db.Column(db.Integer, default=0, nullable=False)
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "code_type": self.code_type,
            "run_label": self.run_label,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "stopped_at": self.stopped_at.isoformat() if self.stopped_at else None,
            "status": self.status,
            "rows_seen": self.rows_seen,
            "modified_updates": self.modified_updates,
            "new_starts": self.new_starts,
            "rows_appended": self.rows_appended,
            "message": self.message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
