from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

import httpx

logger = logging.getLogger("uvicorn.error")


@dataclass(frozen=True)
class GeminiConfig:
    api_key: str = ""
    model: str = "gemini-2.5-flash"
    timeout_seconds: float = 12.0
    max_output_tokens: int = 900
    thinking_budget: int | None = 0
    api_base_url: str = "https://generativelanguage.googleapis.com/v1beta"


class GeminiClient:
    """Small REST client for Gemini generateContent.

    The project already depends on httpx, so this avoids introducing a new SDK
    dependency while keeping all Google-specific request/response handling in one place.
    """

    def __init__(self, config: GeminiConfig):
        self.config = config
        self.last_error: str | None = None

    @property
    def is_configured(self) -> bool:
        return bool(self.config.api_key)

    @property
    def model(self) -> str:
        return self.config.model

    @property
    def model_path(self) -> str:
        model = self.config.model.strip().strip("/")
        if model.startswith("models/"):
            return model
        return f"models/{model}"

    def generate_text(
        self,
        prompt: str,
        *,
        temperature: float = 0.2,
        max_output_tokens: int | None = None,
        response_mime_type: str | None = None,
        response_schema: dict[str, Any] | None = None,
    ) -> str | None:
        self.last_error = None
        if not self.is_configured:
            self.last_error = "gemini_api_key_missing"
            return None

        generation_config: dict[str, Any] = {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens or self.config.max_output_tokens,
        }
        if self.config.thinking_budget is not None:
            generation_config["thinkingConfig"] = {
                "thinkingBudget": self.config.thinking_budget,
            }
        if response_mime_type:
            generation_config["responseMimeType"] = response_mime_type
        if response_schema:
            generation_config["responseSchema"] = response_schema

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": generation_config,
        }
        url = f"{self.config.api_base_url.rstrip('/')}/{self.model_path}:generateContent"
        headers = {
            "x-goog-api-key": self.config.api_key,
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=self.config.timeout_seconds) as client:
                response = client.post(url, headers=headers, json=payload)
                response.raise_for_status()
            return self._extract_text(response.json())
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code if exc.response is not None else "unknown"
            detail = exc.response.text[:300] if exc.response is not None else str(exc)
            self.last_error = f"http_{status}: {detail}"
            logger.warning("gemini_http_error status=%s detail=%s", status, detail)
        except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
            self.last_error = str(exc)
            logger.warning("gemini_request_failed err=%s", str(exc))
        return None

    def generate_json(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        max_output_tokens: int = 500,
        response_schema: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        text = self.generate_text(
            prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            response_mime_type="application/json",
            response_schema=response_schema,
        )
        if not text:
            return None

        try:
            parsed = json.loads(self._strip_json_fences(text))
        except json.JSONDecodeError as exc:
            self.last_error = f"json_parse_failed: {exc}"
            logger.warning("gemini_json_parse_failed err=%s text=%s", str(exc), text[:300])
            return None

        return parsed if isinstance(parsed, dict) else None

    @staticmethod
    def _extract_text(payload: dict[str, Any]) -> str | None:
        candidates = payload.get("candidates") or []
        if not candidates:
            return None

        parts = candidates[0].get("content", {}).get("parts", [])
        text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
        text = "".join(text_parts).strip()
        return text or None

    @staticmethod
    def _strip_json_fences(text: str) -> str:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.removeprefix("```json").removeprefix("```").strip()
            cleaned = cleaned.removesuffix("```").strip()
        return cleaned
