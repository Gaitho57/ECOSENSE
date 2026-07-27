"""
EcoSense AI — Self-hosted local language model client.

This module is the single entry point for all generative text in EcoSense.
It uses NO external paid APIs (no OpenAI, no per-call credits). Everything runs
on infrastructure you control.

Backend resolution order (first available wins, checked once per process):

    1. Ollama HTTP server          — recommended for a CPU-only server.
                                     Set OLLAMA_HOST (e.g. http://localhost:11434)
                                     and LOCAL_LLM_MODEL (e.g. "llama3.2:1b").
    2. Local HuggingFace transformers — if `transformers` is installed. Uses a
                                     small seq2seq model (flan-t5 family) that
                                     runs on CPU.
    3. None                        — the caller falls back to EcoSense's
                                     deterministic expert templates. This is the
                                     "hybrid" design: regulated / structured
                                     content is always produced deterministically,
                                     and the local LLM only augments the free-text
                                     narrative when it is available.

Because of (3), the platform is fully functional even with no model installed —
it simply produces template-driven prose instead of LLM-polished prose.
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

_client = None

DEFAULT_SYSTEM_ROLE = (
    "You are a NEMA-registered Environmental Impact Assessment (EIA) lead expert "
    "writing for a professional Kenyan regulatory audience. Be precise, factual, "
    "and concise. Do not invent legal citations."
)


class LocalLLM:
    """A thin, dependency-light wrapper over a locally hosted text model."""

    def __init__(self):
        self.backend = None
        self._hf_pipeline = None
        self.model = getattr(settings, "LOCAL_LLM_MODEL", "llama3.2:1b")
        self.ollama_host = getattr(settings, "OLLAMA_HOST", "").rstrip("/")
        self.hf_model = getattr(settings, "LOCAL_LLM_HF_MODEL", "google/flan-t5-base")
        self.timeout = int(getattr(settings, "LOCAL_LLM_TIMEOUT", 120))
        self.enable_transformers = bool(
            getattr(settings, "LOCAL_LLM_ENABLE_TRANSFORMERS", True)
        )
        self._resolve_backend()

    # ------------------------------------------------------------------ #
    # Backend resolution
    # ------------------------------------------------------------------ #
    def _resolve_backend(self):
        # 1. Ollama (preferred on CPU-only servers)
        if self.ollama_host:
            try:
                resp = requests.get(f"{self.ollama_host}/api/tags", timeout=5)
                if resp.ok:
                    self.backend = "ollama"
                    logger.info(
                        "LocalLLM: using Ollama backend at %s (model=%s)",
                        self.ollama_host,
                        self.model,
                    )
                    return
                logger.warning(
                    "LocalLLM: Ollama at %s returned HTTP %s; skipping.",
                    self.ollama_host,
                    resp.status_code,
                )
            except Exception as exc:  # noqa: BLE001 - connectivity probe
                logger.warning(
                    "LocalLLM: Ollama not reachable at %s (%s); trying next backend.",
                    self.ollama_host,
                    exc,
                )

        # 2. Local transformers model
        if self.enable_transformers:
            try:
                from transformers import pipeline

                self._hf_pipeline = pipeline(
                    "text2text-generation",
                    model=self.hf_model,
                    max_new_tokens=512,
                )
                self.backend = "transformers"
                logger.info(
                    "LocalLLM: using local transformers backend (model=%s)",
                    self.hf_model,
                )
                return
            except Exception as exc:  # noqa: BLE001 - optional dependency
                logger.warning(
                    "LocalLLM: transformers backend unavailable (%s).", exc
                )

        # 3. No generative backend — deterministic templates will be used.
        self.backend = None
        logger.info(
            "LocalLLM: no generative backend available; "
            "EcoSense will use deterministic expert templates."
        )

    @property
    def available(self) -> bool:
        return self.backend is not None

    # ------------------------------------------------------------------ #
    # Generation
    # ------------------------------------------------------------------ #
    def generate(
        self,
        prompt: str,
        system_role: str = None,
        max_tokens: int = 512,
        temperature: float = 0.3,
    ):
        """Return generated text, or ``None`` if generation is unavailable/failed.

        Callers MUST treat ``None`` as "use the deterministic fallback".
        """
        if not self.available:
            return None
        system_role = system_role or DEFAULT_SYSTEM_ROLE
        try:
            if self.backend == "ollama":
                return self._generate_ollama(
                    prompt, system_role, max_tokens, temperature
                )
            if self.backend == "transformers":
                return self._generate_transformers(prompt, system_role, max_tokens)
        except Exception as exc:  # noqa: BLE001 - never break the request
            logger.warning("LocalLLM generation failed (%s): %s", self.backend, exc)
        return None

    def _generate_ollama(self, prompt, system_role, max_tokens, temperature):
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_role,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        resp = requests.post(
            f"{self.ollama_host}/api/generate", json=payload, timeout=self.timeout
        )
        resp.raise_for_status()
        text = (resp.json().get("response") or "").strip()
        return text or None

    def _generate_transformers(self, prompt, system_role, max_tokens):
        full_prompt = f"{system_role}\n\n{prompt}" if system_role else prompt
        out = self._hf_pipeline(full_prompt, max_new_tokens=max_tokens)
        if out and isinstance(out, list):
            text = (out[0].get("generated_text") or "").strip()
            return text or None
        return None


def get_local_llm() -> LocalLLM:
    """Return the process-wide LocalLLM singleton (resolved once)."""
    global _client
    if _client is None:
        _client = LocalLLM()
    return _client
