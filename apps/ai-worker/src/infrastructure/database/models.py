from typing import Optional, List, Any
from datetime import datetime
from sqlalchemy import (
    String, Integer, Boolean, DateTime, ForeignKey, 
    Text, LargeBinary, JSON, func, Column, BigInteger, Date, Float, Numeric
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.dialects import postgresql

class Base(DeclarativeBase):
    """SQLAlchemy 2.0 Declarative Base"""
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    github_id: Mapped[int] = mapped_column(BigInteger, nullable=False, unique=True)
    login: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text)
    github_access_token: Mapped[Optional[str]] = mapped_column(Text)
    installation_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Organization(Base):
    __tablename__ = "organizations"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    github_id: Mapped[int] = mapped_column(BigInteger, nullable=False, unique=True)
    login: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    display_name: Mapped[Optional[str]] = mapped_column(Text)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text)
    type: Mapped[str] = mapped_column(Text, nullable=False, default='Organization')
    installation_id: Mapped[int] = mapped_column(BigInteger, nullable=False, unique=True)
    plan_tier: Mapped[str] = mapped_column(Text, nullable=False, default='free')
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    quality_gate_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=80)
    # Maximum PR analyses per developer per day (0 = unlimited)
    daily_pr_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Developer(Base):
    __tablename__ = "developers"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    github_id: Mapped[int] = mapped_column(BigInteger, nullable=False, unique=True)
    login: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    display_name: Mapped[Optional[str]] = mapped_column(Text)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text)
    expertise_vector = mapped_column(Vector(1536))
    total_prs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_findings: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_quality_score: Mapped[Optional[float]] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Repository(Base):
    __tablename__ = "repositories"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    github_id: Mapped[int] = mapped_column(BigInteger, nullable=False, unique=True)
    organization_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    default_branch: Mapped[str] = mapped_column(Text, nullable=False, default='main')
    primary_language: Mapped[Optional[str]] = mapped_column(Text)
    is_private: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    analysis_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    avg_quality_score: Mapped[Optional[float]] = mapped_column(Float)
    total_prs_analyzed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class WebhookPayload(Base):
    __tablename__ = "webhook_payloads"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    delivery_id: Mapped[Any] = mapped_column(UUID(as_uuid=False), nullable=False, unique=True)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    action: Mapped[Optional[str]] = mapped_column(Text)
    installation_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    organization_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("organizations.id", ondelete="SET NULL"))
    repository_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("repositories.id", ondelete="SET NULL"))
    sender_login: Mapped[Optional[str]] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    signature_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    aggregate_id: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    kafka_topic: Mapped[str] = mapped_column(Text, nullable=False)
    payload_proto: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error: Mapped[Optional[str]] = mapped_column(Text)

class PullRequest(Base):
    __tablename__ = "pull_requests"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    github_pr_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    repository_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    pull_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text)
    author_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("developers.id", ondelete="SET NULL"))
    author_login: Mapped[str] = mapped_column(Text, nullable=False)
    base_branch: Mapped[str] = mapped_column(Text, nullable=False)
    head_branch: Mapped[str] = mapped_column(Text, nullable=False)
    head_sha: Mapped[str] = mapped_column(Text, nullable=False)
    base_sha: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False, default="open")
    is_draft: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    merged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    analysis_status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")
    quality_score: Mapped[Optional[int]] = mapped_column(Integer)
    merge_blocked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    check_run_id: Mapped[Optional[int]] = mapped_column(BigInteger)
    check_run_url: Mapped[Optional[str]] = mapped_column(Text)
    check_run_conclusion: Mapped[Optional[str]] = mapped_column(Text)
    analysis_started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    analysis_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    analysis_duration_ms: Mapped[Optional[int]] = mapped_column(Integer)
    additions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    deletions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    changed_files: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    findings_critical: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    findings_high: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    findings_medium: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    findings_low: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    findings_info: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    model_id: Mapped[Optional[str]] = mapped_column(Text)
    total_input_tokens: Mapped[Optional[int]] = mapped_column(Integer)
    total_output_tokens: Mapped[Optional[int]] = mapped_column(Integer)
    github_created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    github_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    findings: Mapped[List["ReviewFinding"]] = relationship("ReviewFinding", back_populates="pull_request", cascade="all, delete-orphan")

class ReviewFinding(Base):
    __tablename__ = "review_findings"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    pull_request_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=False)
    repository_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    line_start: Mapped[int] = mapped_column(Integer, nullable=False)
    line_end: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_fix: Mapped[Optional[str]] = mapped_column(Text)
    raw_details: Mapped[Optional[str]] = mapped_column(Text)
    fingerprint: Mapped[str] = mapped_column(Text, nullable=False)
    is_suppressed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    suppressed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    suppressed_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("developers.id", ondelete="SET NULL"))
    suppression_reason: Mapped[Optional[str]] = mapped_column(Text)
    score_weight: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    embedding = mapped_column(Vector(1536))
    detector_type: Mapped[str] = mapped_column(Text, nullable=False, default="llm")
    model_id: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    pull_request: Mapped["PullRequest"] = relationship("PullRequest", back_populates="findings")

class RepositoryPolicy(Base):
    """Per-org or per-repo analysis configuration. AI Worker reads this to customize behavior."""
    __tablename__ = "repository_policies"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    repository_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=True)
    organization_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    quality_gate_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=80)
    block_on_critical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    enabled_categories: Mapped[List[str]] = mapped_column(postgresql.ARRAY(Text()), nullable=False, default=['Security', 'Complexity', 'Architecture', 'Style'])
    ignore_paths: Mapped[List[str]] = mapped_column(postgresql.ARRAY(Text()), nullable=False, default=[])
    custom_rules_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    max_findings_per_pr: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    # Auto-approve PRs that score 100/100
    auto_approve_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # AI analysis focus categories (subset of all categories the AI should prioritize)
    analysis_focus: Mapped[List[str]] = mapped_column(postgresql.ARRAY(Text()), nullable=False, default=['Security', 'Complexity', 'Performance', 'Style'])
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DoraDailyRollup(Base):
    __tablename__ = "dora_daily_rollup"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    date: Mapped[datetime] = mapped_column(Date, nullable=False)
    repository_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("repositories.id", ondelete="CASCADE"))
    organization_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    deployments_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lead_time_p50_mins: Mapped[Optional[float]] = mapped_column(Float)
    lead_time_p95_mins: Mapped[Optional[float]] = mapped_column(Float)
    lead_time_p99_mins: Mapped[Optional[float]] = mapped_column(Float)
    prs_merged: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    prs_reverted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mttr_p50_mins: Mapped[Optional[float]] = mapped_column(Float)
    mttr_p95_mins: Mapped[Optional[float]] = mapped_column(Float)
    avg_quality_score: Mapped[Optional[float]] = mapped_column(Float)
    min_quality_score: Mapped[Optional[int]] = mapped_column(Integer)
    max_quality_score: Mapped[Optional[int]] = mapped_column(Integer)
    prs_blocked: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    prs_passed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    findings_critical: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    findings_high: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    findings_medium: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    findings_low: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    findings_info: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    findings_suppressed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_prs_analyzed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    avg_analysis_ms: Mapped[Optional[float]] = mapped_column(Float)
    total_input_tokens: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    total_output_tokens: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
