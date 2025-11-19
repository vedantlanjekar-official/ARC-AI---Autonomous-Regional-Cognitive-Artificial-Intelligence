"""
FastAPI application entrypoint for the Mini Hub service.

Full ARC-AI transport behaviors (cache, queue, gossip) will be implemented later.
"""

from fastapi import FastAPI

from common.logging import configure_logging

configure_logging("mini-hub")

app = FastAPI(title="ARC-AI Mini Hub Prototype")


@app.get("/healthz")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


