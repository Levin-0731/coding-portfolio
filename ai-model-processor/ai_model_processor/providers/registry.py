from __future__ import annotations

from typing import Any

from .base import Provider
from .mock import MockProvider
from .openai import OpenAIProvider


def create_provider(name: str, api: dict[str, Any]) -> Provider:
    normalized = name.lower()
    if normalized == "mock":
        return MockProvider()
    if normalized == "openai":
        return OpenAIProvider(api)
    raise ValueError(f"Unsupported provider: {name}")
