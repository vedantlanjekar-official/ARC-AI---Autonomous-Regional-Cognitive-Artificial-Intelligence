"""
Generate Ed25519 keypairs for ARC-AI nodes.

Usage:
    python tools/gen_keys.py --nodes main mh1 mh2 mh3

Keys are emitted under ./keys/{node}_signing.key and ./keys/{node}_verify.key.
"""

from __future__ import annotations

from pathlib import Path
from typing import List

import typer

from common.crypto import generate_signing_keypair

app = typer.Typer(add_completion=False, help="ARC-AI key generation utility.")


def write_key(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value + "\n")


@app.command()
def main(nodes: List[str] = typer.Argument(..., help="Node identifiers to generate keys for.")) -> None:
    """Generate signing/verify keypairs for provided nodes."""

    for node in nodes:
        signing_key, verify_key = generate_signing_keypair()
        write_key(Path("keys") / f"{node}_signing.key", signing_key)
        write_key(Path("keys") / f"{node}_verify.key", verify_key)
        typer.echo(f"Generated keys for {node}")


if __name__ == "__main__":
    app()

