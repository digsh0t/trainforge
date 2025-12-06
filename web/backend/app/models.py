from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Installation(Base):
    """GitHub App installation record."""

    __tablename__ = "installations"

    id = Column(Integer, primary_key=True)
    installation_id = Column(BigInteger, unique=True, nullable=False, index=True)
    github_user_id = Column(BigInteger, nullable=False)
    github_username = Column(String(255), nullable=False)
    access_token = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    repositories = relationship(
        "Repository", back_populates="installation", cascade="all, delete-orphan"
    )


class Repository(Base):
    """Connected GitHub repository."""

    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True)
    installation_id = Column(Integer, ForeignKey("installations.id"), nullable=False)
    github_repo_id = Column(BigInteger, unique=True, nullable=False, index=True)
    owner = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    full_name = Column(String(512), nullable=False, index=True)
    default_branch = Column(String(255), default="main")
    has_workflow = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    installation = relationship("Installation", back_populates="repositories")
    runs = relationship(
        "TrainingRun", back_populates="repository", cascade="all, delete-orphan"
    )


class TrainingRun(Base):
    """Training run triggered via GitHub Actions."""

    __tablename__ = "training_runs"

    id = Column(Integer, primary_key=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    github_run_id = Column(BigInteger, unique=True, nullable=False, index=True)
    github_run_url = Column(String(1024))
    template = Column(String(50))
    status = Column(String(50), default="queued")
    conclusion = Column(String(50), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    repository = relationship("Repository", back_populates="runs")
