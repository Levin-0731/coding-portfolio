from __future__ import annotations

from .base import ProviderRequest, ProviderResponse


CALLS: list[str] = []


class MockProvider:
    """Deterministic provider for local demos and tests."""

    def process(self, request: ProviderRequest) -> ProviderResponse:
        row_id = str(request.row.get("id", ""))
        CALLS.append(f"{request.model}:{row_id}")
        fail_ids = {str(item) for item in (request.options.get("mock_fail_ids") or [])}
        if row_id in fail_ids:
            raise RuntimeError("mock failure")
        prefix = str(request.options.get("mock_prefix", "MOCK"))
        return ProviderResponse(
            result=f"{prefix}[{request.model}/{request.task_type}]: {request.prompt}",
            raw={"provider": "mock"},
        )
