"""
Seed the main hub with initial capsules using the admin seed endpoint.

Example:
    python tools/seed_capsules.py --main-host http://localhost:8000 --file seeds/initial_capsules.json
"""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import typer

app = typer.Typer(add_completion=False, help="Seed initial capsules into the main hub.")


@app.command()
def main(
    file: Path = typer.Option(..., "--file", "-f", help="Path to JSON file containing seed entries."),
    main_host: str = typer.Option("http://localhost:8000", "--main-host", help="Main hub base URL."),
) -> None:
    if not file.exists():
        raise typer.BadParameter(f"Seed file not found: {file}")

    entries = json.loads(file.read_text())
    if not isinstance(entries, list):
        raise typer.BadParameter("Seed file must contain a JSON list of entries.")

    with httpx.Client(timeout=10.0) as client:
        response = client.post(f"{main_host}/admin/seed", json=entries)
        response.raise_for_status()
        typer.echo(f"Seeded capsules: {response.json().get('seeded')}")


if __name__ == "__main__":
    app()

