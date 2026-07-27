# Self-Hosted AI in EcoSense

EcoSense generates all narrative text **on infrastructure you control**. There is
no dependency on OpenAI or any external paid API, and no per-call credits.

## How it works (hybrid design)

Text generation follows a three-tier chain, resolved once per process in
`backend/core/ai.py` (`LocalLLM`):

1. **Ollama (recommended, CPU-friendly).** If `OLLAMA_HOST` is set and reachable,
   EcoSense sends prompts to your local Ollama server over HTTP. No Python
   package is required — it uses plain `requests`.
2. **Local transformers model.** If Ollama is not configured/reachable and
   `transformers` (+ `torch`) is installed, a small local seq2seq model
   (`LOCAL_LLM_HF_MODEL`, default `google/flan-t5-base`) runs on CPU.
3. **Deterministic expert templates.** If neither generative backend is
   available, EcoSense produces report prose from its built-in, domain-specific
   Kenyan EIA templates. **The platform is fully functional with no model at
   all** — it simply writes template prose instead of model-polished prose.

Regulated/structured content (legal citations, mitigation hierarchy, compliance)
is **always** produced deterministically. The local model only rewrites the
free-text narrative. That is the "hybrid": deterministic where correctness
matters, generative where fluency helps.

## Recommended setup on a CPU-only server

```bash
# 1. Install Ollama (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull a small, CPU-friendly model
ollama pull llama3.2:1b        # ~1.3 GB; try qwen2.5:1.5b for better quality

# 3. Point EcoSense at it (in backend/.env)
OLLAMA_HOST=http://localhost:11434
LOCAL_LLM_MODEL=llama3.2:1b
```

On CPU, generation of a paragraph takes a few seconds to ~a minute depending on
the model and hardware. Because report generation should run as an async Celery
task (see the audit report, finding C-4), that latency is acceptable.

## The impact-prediction model

The XGBoost severity/probability models are trained **inside the system** — no
external API. Train them with:

```bash
cd backend
python apps/predictions/ml/train.py
```

- With **no** dataset, training uses a rules-bootstrapped synthetic set. The
  resulting model only approximates EcoSense's built-in expert rules — useful to
  exercise the pipeline, **not** a production model. Probability labels are now
  derived deterministically (they used to be random), so metrics are meaningful
  and reproducible.
- For a **production** model, provide a real labelled corpus:

  ```bash
  EIA_TRAINING_CSV=/path/to/real_eia_outcomes.csv python apps/predictions/ml/train.py
  ```

  The CSV needs the feature columns (`scale_ha`, `ndvi_score`,
  `distance_to_water_km`, `threatened_species_count`, `aqi_baseline`,
  `urban_proximity_km`, `rainfall_mm`, `project_type`) plus a
  `<category>_severity` label column per category (and optionally
  `<category>_probability`).

When no trained model exists for a category, predictions fall back to the
deterministic expert-rules engine and report `prediction_method: "expert_rules"`
with a lower confidence, so consumers can tell how each figure was produced.

## Fine-tuning on your own EIA reports (optional, later)

Once you have a corpus of approved Kenyan EIA reports you can fine-tune the
Ollama model (e.g. a LoRA adapter) so the prose matches your house style, and
point `LOCAL_LLM_MODEL` at the fine-tuned tag. The application code does not
change — only the model behind `OLLAMA_HOST` does.
