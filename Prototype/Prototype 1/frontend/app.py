import os
from pathlib import Path
from typing import Optional

from datetime import datetime

from fastapi import FastAPI, Form, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI(title="ARC-AI Messaging Portal")

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))
templates.env.globals["current_year"] = datetime.utcnow().year
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

MINI_HUB_API = os.getenv("FRONTEND_MINI_HUB_URL", "http://localhost:8101")


def _current_user(request: Request) -> Optional[str]:
    return request.cookies.get("arcai_user")


@app.get("/", response_class=HTMLResponse)
async def hero(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        "index.html",
        {"request": request},
    )


@app.get("/healthz")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request) -> HTMLResponse:
    if _current_user(request):
        return RedirectResponse(url="/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    return templates.TemplateResponse(
        "login.html",
        {"request": request},
    )


@app.post("/login")
async def login_submit(username: str = Form(...)) -> RedirectResponse:
    username = username.strip()
    if not username:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

    response = RedirectResponse(url="/dashboard", status_code=status.HTTP_303_SEE_OTHER)
    response.set_cookie(
        "arcai_user",
        username,
        httponly=False,
        max_age=60 * 60 * 12,
        samesite="lax",
    )
    return response


@app.get("/logout")
async def logout() -> RedirectResponse:
    response = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    response.delete_cookie("arcai_user")
    return response


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request) -> HTMLResponse:
    username = _current_user(request)
    if not username:
        return RedirectResponse(url="/login", status_code=status.HTTP_303_SEE_OTHER)

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "username": username,
            "mini_hub_url": MINI_HUB_API,
        },
    )

