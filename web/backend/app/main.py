"""TrainForge API - Simple backend for ML training management."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.routes import auth_router, repos_router, workflows_router, webhook_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="TrainForge API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(repos_router, prefix="/api")
app.include_router(workflows_router, prefix="/api")
app.include_router(webhook_router, prefix="/api")


@app.get("/")
async def root():
    return {"name": "TrainForge API", "status": "ok"}


@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "healthy", "github_configured": bool(settings.github_app_id)}
