from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass(frozen=True)
class ProviderRequest:
    model: str
    task_type: str
    prompt: str
    row: dict[str, Any]
    options: dict[str, Any]


@dataclass(frozen=True)
class ProviderResponse:
    result: str
    raw: dict[str, Any] | None = None


class Provider(Protocol):
    def process(self, request: ProviderRequest) -> ProviderResponse:
        """Process one row and return a normalized response."""
