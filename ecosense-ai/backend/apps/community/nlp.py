"""
EcoSense AI — Natural Language Processing for community feedback.

Runs entirely on self-hosted models (no external paid API):
  * Sentiment  — a local multilingual transformers classifier.
  * Simplification / translation — the self-hosted local LLM (core.ai), with a
    deterministic extractive summary as a guaranteed fallback.
"""

import logging
import re

from celery import shared_task
from apps.community.models import CommunityFeedback
from core.ai import get_local_llm

logger = logging.getLogger(__name__)

_sentiment_analyzer = None

def get_sentiment_analyzer():
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        try:
            from transformers import pipeline
            # Cache HuggingFace logic dynamically loading safely
            _sentiment_analyzer = pipeline("sentiment-analysis", model="cardiffnlp/twitter-xlm-roberta-base-sentiment", truncation=True, max_length=512)
        except Exception as e:
            logger.warning(f"Transformer pipeline failed to load: {e}")
            _sentiment_analyzer = False # Mark as failed to avoid retrying
    return _sentiment_analyzer if _sentiment_analyzer is not False else None

_LANG_NAMES = {"en": "English", "sw": "Swahili"}


def simplify_document(technical_text: str, target_language: str = 'en') -> str:
    """
    Summarise technical EIA text into plain language for community members.

    Uses the self-hosted local LLM when available; otherwise falls back to a
    deterministic extractive summary so the feature never hard-fails and never
    depends on an external paid API.
    """
    text = (technical_text or "").strip()
    if not text:
        return ""

    llm = get_local_llm()
    if llm.available:
        lang_name = _LANG_NAMES.get(target_language, target_language)
        prompt = (
            f"Summarise the following technical EIA text in simple {lang_name} that a "
            f"non-expert community member can understand. Use short sentences and avoid "
            f"jargon.\n\nTEXT:\n{text}"
        )
        resp = llm.generate(
            prompt,
            system_role="You are helping a community member understand an environmental project.",
            max_tokens=400,
        )
        if resp:
            words = resp.split()
            return " ".join(words[:300]) + ("..." if len(words) > 300 else "")

    # Deterministic fallback: extractive summary (first sentences, capped).
    return _extractive_summary(text)


def _extractive_summary(text: str, max_words: int = 120) -> str:
    """Return the leading sentences of ``text`` up to ``max_words`` words."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    out, count = [], 0
    for sentence in sentences:
        words = sentence.split()
        if not words:
            continue
        out.append(sentence)
        count += len(words)
        if count >= max_words:
            break
    summary = " ".join(out).strip()
    return summary or text[:600]


def analyse_feedback(feedback_text: str) -> dict:
    """
    Evaluates structures securely running arrays isolating Sentiment + Classification keywords explicitly.
    """
    res = {
        "sentiment": "neutral",
        "categories": []
    }
    
    txt = feedback_text.lower()
    
    # 1. Classification via exact structural mapping — NEMA EIA specific mappings
    base_cats = [
        "water", "displacement", "jobs", "noise", "dust", "wildlife", "health", 
        "traffic", "compensation", "consultation", "livelihoods", "sacred", 
        "heritage", "resettlement", "vulnerable", "safety", "pollution", 
        "drainage", "employment", "land", "access", "trees", "rivers", "economy"
    ]
    for c in base_cats:
        if c in txt:
             res["categories"].append(c)
             
    # 2. Sentiment
    analyzer = get_sentiment_analyzer()
    if analyzer:
        try:
            # cardiffnlp uses labels: LABEL_0 (neg), LABEL_1 (neu), LABEL_2 (pos) logically
            out = analyzer(feedback_text[:512])[0]
            label = out['label']
            if label == 'LABEL_0' or 'negative' in label.lower():
                res['sentiment'] = 'negative'
            elif label == 'LABEL_2' or 'positive' in label.lower():
                res['sentiment'] = 'positive'
            else:
                res['sentiment'] = 'neutral'
        except Exception as e:
            logger.error(f"Transformer failed during inference natively: {e}")
            res['sentiment'] = _fallback_sentiment(txt)
    else:
        res['sentiment'] = _fallback_sentiment(txt)
        
    return res

def _fallback_sentiment(txt: str) -> str:
    pos_w = [
        "good", "great", "excellent", "happy", "support", "thanks", "approve", 
        "better", "safe", "welcome", "benefits", "opportunity", "progress", 
        "positive", "needed", "agree", "okay", "yes"
    ]
    neg_w = [
        "bad", "terrible", "angry", "hate", "worry", "dangerous", "unhappy", 
        "oppose", "noisy", "dirty", "stop", "no", "problem", "fear", "harm", 
        "damage", "worse", "illegal", "threat"
    ]
    
    pos_c = sum(1 for w in pos_w if w in txt)
    neg_c = sum(1 for w in neg_w if w in txt)
    
    if pos_c > neg_c: return "positive"
    if neg_c > pos_c: return "negative"
    return "neutral"


@shared_task(bind=True)
def process_feedback_nlp(self, feedback_id: str):
    """
    Background worker aggregating logic executing language arrays seamlessly.
    """
    try:
        feedback = CommunityFeedback.objects.get(id=feedback_id)
    except CommunityFeedback.DoesNotExist:
        return "Feedback record tracking failed."

    # 1. Base language extraction
    raw = feedback.raw_text
    lang = 'en'
    try:
         from langdetect import detect
         lang = detect(raw)
         feedback.language = lang[:10]
    except Exception:
         pass 

    # 2. For non-English feedback, produce a plain-English rendering to feed the
    #    downstream keyword classifier. The sentiment model is multilingual, so
    #    this only needs to be best-effort.
    target_text = raw
    if lang != 'en':
         feedback.translated_text = simplify_document(raw, target_language='en')
         if feedback.translated_text:
             target_text = feedback.translated_text

    # 3. Analyze iteratively
    analysis = analyse_feedback(target_text)
    
    feedback.sentiment = analysis["sentiment"]
    # We combine user provided categories seamlessly avoiding overrides 
    existing = set(feedback.categories) if feedback.categories else set()
    combined = list(existing.union(set(analysis["categories"])))
    feedback.categories = combined
    
    feedback.save(update_fields=['language', 'translated_text', 'sentiment', 'categories'])
    return f"NLP Processed Successfully [Sentiment: {analysis['sentiment']}]"
