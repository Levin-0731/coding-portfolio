from __future__ import annotations

import os
from typing import Any

import requests

from .base import ProviderRequest, ProviderResponse


class OpenAIProvider:
    def __init__(self, api: dict[str, Any]) -> None:
        api_key_env = str(api.get("api_key_env", "OPENAI_API_KEY"))
        api_key = api.get("api_key") or os.getenv(api_key_env)
        if not api_key:
            raise ValueError(f"OpenAI API key not found. Set api.api_key or env var {api_key_env}.")

        self.api_key = str(api_key)
        self.base_url = str(api.get("base_url", "https://api.openai.com/v1")).rstrip("/")
        self.timeout = float(api.get("timeout", 120))

    def process(self, request: ProviderRequest) -> ProviderResponse:
        if request.task_type != "text_to_text":
            raise ValueError("OpenAIProvider currently supports task_type=text_to_text only.")

        payload = {
            "model": request.model,
            "messages": [{"role": "user", "content": request.prompt}],
        }
        payload.update(request.options.get("openai", {}))

        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=self.timeout,
        )
        response.raise_for_status()
        data = response.json()
        result = data["choices"][0]["message"]["content"]
        return ProviderResponse(result=result, raw=data)
