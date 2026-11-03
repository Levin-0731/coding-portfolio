from __future__ import annotations

from .base import ProviderRequest, ProviderResponse


class MockProvider:
    """Deterministic provider for local demos and tests."""

    def process(self, request: ProviderRequest) -> ProviderResponse:
        prefix = str(request.options.get("mock_prefix", "MOCK"))
        return ProviderResponse(
            result=f"{prefix}[{request.model}/{request.task_type}]: {request.prompt}",
            raw={"provider": "mock"},
        )
