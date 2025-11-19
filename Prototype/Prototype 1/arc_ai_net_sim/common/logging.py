"""
Logging helpers for consistent trace output across services.

Adds contextual fields like packet IDs, chunk indices, ACK/NAK status to support
observability during simulations.
"""

from __future__ import annotations

import logging
import sys


def configure_logging(service_name: str) -> None:
    """Configure structured logging for a given service."""

    logging.basicConfig(
        level=logging.INFO,
        format=f"%(asctime)s | {service_name} | %(levelname)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


