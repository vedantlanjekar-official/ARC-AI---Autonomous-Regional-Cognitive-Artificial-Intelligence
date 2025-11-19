"""
Run demo scenarios showcasing ARC-AI transport behaviours.

Scenarios:
  - cache-hit: uses seeded capsule to demonstrate local cache.
  - authoritative: sends a new question and waits for authoritative response.
  - offline: increases packet loss to 100%%, triggers fallback, restores connectivity,
             and confirms reconciliation after retransmit.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Optional

import httpx
import typer

from mini_hub.cache import compute_question_hash

app = typer.Typer(add_completion=False, help="ARC-AI demo scenario runner.")


def read_seeds(seed_file: Path) -> list[dict]:
    if not seed_file.exists():
        raise typer.BadParameter(f"Seed file not found: {seed_file}")
    data = json.loads(seed_file.read_text())
    if not isinstance(data, list):
        raise typer.BadParameter("Seed file must contain a list of entries.")
    return data


def post_query(mini_url: str, user_id: str, question: str) -> dict:
    with httpx.Client(timeout=20.0) as client:
        response = client.post(
            f"{mini_url}/query",
            json={"user_id": user_id, "question": question, "context": None},
        )
        response.raise_for_status()
        return response.json()


def set_network_conditions(network_url: str, **kwargs) -> None:
    with httpx.Client(timeout=10.0) as client:
        response = client.post(f"{network_url}/admin/config", json=kwargs)
        response.raise_for_status()


def scenario_cache_hit(mini_url: str, seeds: list[dict]) -> None:
    first = seeds[0]
    result = post_query(mini_url, "demo-user", first["question_text"])
    typer.echo(f"Cache hit response: {result}")


def scenario_authoritative(mini_url: str) -> None:
    question = "Explain quantum entanglement in simple terms."
    result = post_query(mini_url, "demo-user", question)
    typer.echo(f"Authoritative response: {result}")


def scenario_offline(
    mini_url: str,
    network_url: str,
    question: str,
    wait_seconds: int,
) -> None:
    typer.echo("Simulating network partition (packet_loss_pct=100)...")
    set_network_conditions(network_url, packet_loss_pct=100.0)
    fallback = post_query(mini_url, "demo-user", question)
    typer.echo(f"Fallback response: {fallback}")

    typer.echo("Restoring network conditions...")
    set_network_conditions(network_url, packet_loss_pct=5.0)

    typer.echo("Waiting for reconciliation...")
    time.sleep(wait_seconds)

    # Poll capsule list to confirm authoritative capsule ingestion
    with httpx.Client(timeout=10.0) as client:
        listing = client.get(f"{mini_url}/capsules/list").json()

    q_hash = compute_question_hash(question)
    for capsule in listing["capsules"]:
        if capsule["question_hash"] == q_hash and capsule["ingest_source"] != "fallback":
            typer.echo(f"Reconciled capsule: {capsule}")
            break
    else:
        typer.echo("Authoritative capsule not yet ingested. Retry later.")


@app.command()
def run(
    scenario: str = typer.Option("all", help="Scenario to run: cache-hit, authoritative, offline, or all."),
    mini_url: str = typer.Option("http://localhost:8101", help="Mini hub base URL."),
    network_url: str = typer.Option("http://localhost:9000", help="Network simulator base URL."),
    seed_file: Path = typer.Option(Path("seeds/initial_capsules.json"), help="Seed file used for cache hit scenario."),
    wait_seconds: int = typer.Option(6, help="Wait time after restoring connectivity in offline scenario."),
) -> None:
    seeds = read_seeds(seed_file)

    scenarios = []
    if scenario in ("cache-hit", "all"):
        scenarios.append(("Cache Hit", lambda: scenario_cache_hit(mini_url, seeds)))
    if scenario in ("authoritative", "all"):
        scenarios.append(("Authoritative Flow", lambda: scenario_authoritative(mini_url)))
    if scenario in ("offline", "all"):
        offline_question = "How do plants adapt to drought conditions?"
        scenarios.append(
            (
                "Offline Reconciliation",
                lambda: scenario_offline(mini_url, network_url, offline_question, wait_seconds),
            )
        )

    if not scenarios:
        raise typer.BadParameter(f"Unknown scenario: {scenario}")

    for title, func in scenarios:
        typer.echo(f"\n=== Running scenario: {title} ===")
        func()


if __name__ == "__main__":
    app()

