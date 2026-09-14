"""
EcoSense AI - Language Model Client.

This module is the single entry point for all generative text in EcoSense.
It now supports a Hybrid approach:
1. Gemini Cloud API (Best quality, can read 500-page docs)
2. Ollama HTTP server (Offline/Local)
3. Local HuggingFace transformers (Offline/Local CPU)
4. Deterministic expert templates (Fallback)
"""

import logging
import requests
from django.conf import settings

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

logger = logging.getLogger(__name__)

_client = None

DEFAULT_SYSTEM_ROLE = (
    "You are a NEMA-registered Environmental Impact Assessment (EIA) lead expert "
    "writing for a professional Kenyan regulatory audience. Be precise, factual, "
    "and concise. Do not invent legal citations."
)

class LocalLLM:
    """A wrapper handling both Cloud and Local generative models."""

    def __init__(self):
        self.backend = None
        self._hf_pipeline = None
        self.gemini_model = None
        
        # Load API key from environment variables (Never hardcode secrets in source code!)
        import os
        self.gemini_api_key = getattr(settings, "GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY", ""))
        
        self.model = getattr(settings, "LOCAL_LLM_MODEL", "llama3.2:1b")
        self.ollama_host = getattr(settings, "OLLAMA_HOST", "").rstrip("/")
        self.hf_model = getattr(settings, "LOCAL_LLM_HF_MODEL", "google/flan-t5-base")
        self.timeout = int(getattr(settings, "LOCAL_LLM_TIMEOUT", 120))
        self.enable_transformers = bool(getattr(settings, "LOCAL_LLM_ENABLE_TRANSFORMERS", True))
        
        self._resolve_backend()

    def _resolve_backend(self):
        # 1. Gemini Cloud API (Preferred for production/v9 quality)
        if HAS_GEMINI and self.gemini_api_key:
            try:
                genai.configure(api_key=self.gemini_api_key)
                self.gemini_model = genai.GenerativeModel('gemini-1.5-pro')
                self.backend = "gemini"
                logger.info("LocalLLM: using Gemini Cloud API backend (gemini-1.5-pro)")
                return
            except Exception as exc:
                logger.warning("LocalLLM: Gemini API init failed (%s); trying local backends.", exc)

        # 2. Ollama (preferred on CPU-only servers)
        if self.ollama_host:
            try:
                resp = requests.get(f"{self.ollama_host}/api/tags", timeout=5)
                if resp.ok:
                    self.backend = "ollama"
                    logger.info("LocalLLM: using Ollama backend at %s (model=%s)", self.ollama_host, self.model)
                    return
            except Exception as exc:
                logger.warning("LocalLLM: Ollama not reachable at %s (%s).", self.ollama_host, exc)

        # 3. Local transformers model
        if self.enable_transformers:
            try:
                from transformers import pipeline
                self._hf_pipeline = pipeline("text2text-generation", model=self.hf_model, max_new_tokens=512)
                self.backend = "transformers"
                logger.info("LocalLLM: using local transformers backend (model=%s)", self.hf_model)
                return
            except Exception as exc:
                logger.warning("LocalLLM: transformers backend unavailable (%s).", exc)

        # 4. No generative backend
        self.backend = None
        logger.info("LocalLLM: no generative backend available; EcoSense will use deterministic expert templates.")

    @property
    def available(self) -> bool:
        return self.backend is not None

    def generate(self, prompt: str, system_role: str = None, max_tokens: int = 2048, temperature: float = 0.3):
        if not self.available:
            return None
        system_role = system_role or DEFAULT_SYSTEM_ROLE
        try:
            if self.backend == "gemini":
                return self._generate_gemini(prompt, system_role, temperature)
            if self.backend == "ollama":
                return self._generate_ollama(prompt, system_role, max_tokens, temperature)
            if self.backend == "transformers":
                return self._generate_transformers(prompt, system_role, max_tokens)
        except Exception as exc:
            logger.warning("LocalLLM generation failed (%s): %s", self.backend, exc)
        return None

    def _generate_gemini(self, prompt, system_role, temperature):
        full_prompt = f"{system_role}\n\n{prompt}" if system_role else prompt
        response = self.gemini_model.generate_content(
            full_prompt,
            generation_config=genai.types.GenerationConfig(temperature=temperature)
        )
        return response.text.strip()

    def _generate_ollama(self, prompt, system_role, max_tokens, temperature):
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system_role,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        resp = requests.post(f"{self.ollama_host}/api/generate", json=payload, timeout=self.timeout)
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
    global _client
    if _client is None:
        _client = LocalLLM()
    return _client
