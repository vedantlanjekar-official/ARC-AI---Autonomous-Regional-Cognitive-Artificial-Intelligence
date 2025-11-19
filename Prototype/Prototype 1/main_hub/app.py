"""
FastAPI application entrypoint for the Main Hub service.

NOTE: Full implementation added in later tasks per ARC-AI transport plan.
"""

from fastapi import FastAPI

from common.logging import configure_logging

configure_logging("main-hub")

app = FastAPI(title="ARC-AI Main Hub Prototype")


@app.get("/healthz")
async def healthcheck() -> dict[str, str]:
    """Simple health endpoint to support container readiness checks."""

    return {"status": "ok"}


