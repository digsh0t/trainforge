"""Initial migration - create tables

Revision ID: 001_initial
Revises:
Create Date: 2024-12-01

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "installations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("installation_id", sa.BigInteger(), nullable=False),
        sa.Column("github_user_id", sa.BigInteger(), nullable=False),
        sa.Column("github_username", sa.String(255), nullable=False),
        sa.Column("access_token", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_installations_installation_id",
        "installations",
        ["installation_id"],
        unique=True,
    )

    op.create_table(
        "repositories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("github_repo_id", sa.BigInteger(), nullable=False),
        sa.Column("owner", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(512), nullable=False),
        sa.Column(
            "default_branch", sa.String(255), server_default="main", nullable=True
        ),
        sa.Column("has_workflow", sa.Boolean(), server_default="false", nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_repositories_github_repo_id",
        "repositories",
        ["github_repo_id"],
        unique=True,
    )
    op.create_index(
        "ix_repositories_full_name", "repositories", ["full_name"], unique=False
    )

    op.create_table(
        "training_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("repository_id", sa.Integer(), nullable=False),
        sa.Column("github_run_id", sa.BigInteger(), nullable=False),
        sa.Column("github_run_url", sa.String(1024), nullable=True),
        sa.Column("template", sa.String(50), nullable=True),
        sa.Column("status", sa.String(50), server_default="queued", nullable=True),
        sa.Column("conclusion", sa.String(50), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["repository_id"], ["repositories.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_training_runs_github_run_id",
        "training_runs",
        ["github_run_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_training_runs_github_run_id", table_name="training_runs")
    op.drop_table("training_runs")
    op.drop_index("ix_repositories_full_name", table_name="repositories")
    op.drop_index("ix_repositories_github_repo_id", table_name="repositories")
    op.drop_table("repositories")
    op.drop_index("ix_installations_installation_id", table_name="installations")
    op.drop_table("installations")
