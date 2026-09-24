from datetime import datetime, timezone

from main.database.extensions import db


class Denial(db.Model):
    __tablename__ = "denials"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=False, index=True)
    patient = db.Column(db.Text, nullable=False)
    claim_id = db.Column(db.String(500), nullable=False, index=True)
    service_date = db.Column(db.Date, nullable=True)
    service_date_display = db.Column(db.Text, nullable=True)
    billed_amt = db.Column(db.Numeric(12, 2), nullable=True)
    payment_amt = db.Column(db.Numeric(12, 2), nullable=True)
    payer = db.Column(db.Text, nullable=True)
    provider = db.Column(db.Text, nullable=True)
    practice = db.Column(db.Text, nullable=True)
    procedure = db.Column(db.Text, nullable=True)
    modifier = db.Column(db.Text, nullable=True)
    reason = db.Column(db.Text, nullable=True)
    remark = db.Column(db.Text, nullable=True)
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    appeal_status = db.Column(db.String(30), default="pending", nullable=False, index=True)
    appeal_stage = db.Column(db.Integer, default=1, nullable=False)
    appeal_started_at = db.Column(db.DateTime(timezone=True), nullable=True)
    appeal_completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    assigned_action_id = db.Column(db.Integer, db.ForeignKey("denial_actions.id"), nullable=True, index=True)
    action_other_description = db.Column(db.Text, nullable=True)
    action_notes = db.Column(db.Text, nullable=True)
    appeal_started_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    appeal_completed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    action_assigned_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    action_completed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    action_assigned_at = db.Column(db.DateTime(timezone=True), nullable=True)
    action_completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    eob_date = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    date_added = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    assigned_to = db.relationship("User", foreign_keys=[assigned_to_id])
    assigned_action = db.relationship("DenialAction", foreign_keys=[assigned_action_id])
    appeal_started_by = db.relationship("User", foreign_keys=[appeal_started_by_id])
    appeal_completed_by = db.relationship("User", foreign_keys=[appeal_completed_by_id])
    action_assigned_by = db.relationship("User", foreign_keys=[action_assigned_by_id])
    action_completed_by = db.relationship("User", foreign_keys=[action_completed_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "patient": self.patient,
            "claim_id": self.claim_id,
            "service_date": self.service_date.isoformat() if self.service_date else None,
            "service_date_display": self.service_date_display,
            "billed_amt": float(self.billed_amt) if self.billed_amt is not None else None,
            "payment_amt": float(self.payment_amt) if self.payment_amt is not None else None,
            "payer": self.payer,
            "provider": self.provider,
            "practice": self.practice,
            "procedure": self.procedure,
            "modifier": self.modifier,
            "reason": self.reason,
            "remark": self.remark,
            "assigned_to": self.assigned_to.to_dict() if self.assigned_to else None,
            "appeal_status": self.appeal_status,
            "appeal_stage": self.appeal_stage,
            "appeal_started_at": self.appeal_started_at.isoformat() if self.appeal_started_at else None,
            "appeal_completed_at": self.appeal_completed_at.isoformat() if self.appeal_completed_at else None,
            "assigned_action": self.assigned_action.to_dict() if self.assigned_action else None,
            "action_other_description": self.action_other_description,
            "action_notes": self.action_notes,
            "appeal_started_by": self.appeal_started_by.to_dict() if self.appeal_started_by else None,
            "appeal_completed_by": self.appeal_completed_by.to_dict() if self.appeal_completed_by else None,
            "action_assigned_by": self.action_assigned_by.to_dict() if self.action_assigned_by else None,
            "action_completed_by": self.action_completed_by.to_dict() if self.action_completed_by else None,
            "action_assigned_at": self.action_assigned_at.isoformat() if self.action_assigned_at else None,
            "action_completed_at": self.action_completed_at.isoformat() if self.action_completed_at else None,
            "eob_date": self.eob_date.isoformat() if self.eob_date else None,
            "notes": self.notes,
            "date_added": self.date_added.isoformat() if self.date_added else None,
        }


class DenialAction(db.Model):
    __tablename__ = "denial_actions"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False, unique=True, index=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class DenialCategory(db.Model):
    __tablename__ = "denial_categories"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(40), nullable=False, unique=True, index=True)
    category = db.Column(db.String(160), nullable=False, index=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "category": self.category,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class AssignmentRule(db.Model):
    __tablename__ = "assignment_rules"

    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.Integer, db.ForeignKey("organizations.id"), nullable=False, index=True)
    assigned_to_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    criteria = db.Column(db.JSON, nullable=False, default=dict)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    effective_from = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    deactivated_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    assigned_to = db.relationship("User", foreign_keys=[assigned_to_id])
    created_by = db.relationship("User", foreign_keys=[created_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "criteria": self.criteria or {},
            "is_active": self.is_active,
            "effective_from": self.effective_from.isoformat() if self.effective_from else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "deactivated_at": self.deactivated_at.isoformat() if self.deactivated_at else None,
            "assigned_to": self.assigned_to.to_dict() if self.assigned_to else None,
            "created_by": self.created_by.to_dict() if self.created_by else None,
        }
