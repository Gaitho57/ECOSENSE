"""
EcoSense AI — Natural Language Processing Boundaries.

Simplifies heavy technical arrays parsing sentiment safely via transformers mapping LLM capabilities iteratively.
"""

import logging
from celery import shared_task
from django.conf import settings
from apps.community.models import CommunityFeedback

logger = logging.getLogger(__name__)

# Native external structures mapped safely isolating errors securely 
try:
    from langdetect import detect
except ImportError:
    # Basic fallback simulating structural detection 
    def detect(text): return 'en'

try:
    from transformers import pipeline
    # Cache HuggingFace logic dynamically loading safely
    sentiment_analyzer = pipeline("sentiment-analysis", model="cardiffnlp/twitter-xlm-roberta-base-sentiment", truncation=True, max_length=512)
except Exception as e:
    sentiment_analyzer = None
    logger.warning(f"Transformer pipeline skipped logically cleanly: {e}")

try:
    from langchain.chat_models import ChatOpenAI
    from langchain.schema import HumanMessage, SystemMessage
except ImportError:
    ChatOpenAI = None


def simplify_document(technical_text: str, target_language: str = 'en') -> str:
    """
    Condenses arrays mapping strictly to non-technical endpoints translating securely.
    """
    key = getattr(settings, "OPENAI_API_KEY", None)
    if not ChatOpenAI or not key:
        return "Simplicity translations are paused. System requires OpenAI bindings."

    try:
        llm = ChatOpenAI(temperature=0.3, openai_api_key=key)
        prompt = f"Summarise the following technical EIA text in simple language a non-expert can understand. Use short sentences. Avoid jargon. Language: {target_language}. Text: {technical_text}"
        
        messages = [
            SystemMessage(content="You are helping a community member understand an environmental project."),
            HumanMessage(content=prompt)
        ]
        
        resp = llm(messages).content
        
        # Word limit explicitly bound around prompt requests limiting overheads
        words = resp.split()
        if len(words) > 300:
            return " ".join(words[:300]) + "..."
            
        return resp
    except Exception as e:
         logger.warning(f"LLM reduction error natively: {e}")
         return "Summary temporarily unavailable."


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
    if sentiment_analyzer:
        try:
            # cardiffnlp uses labels: LABEL_0 (neg), LABEL_1 (neu), LABEL_2 (pos) logically
            out = sentiment_analyzer(feedback_text[:512])[0]
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
         lang = detect(raw)
         feedback.language = lang[:10]
    except Exception:
         pass 

    # 2. Translate structures dynamically translating explicitly limiting boundaries natively
    target_text = raw
    if lang != 'en':
         # Simplifies bounds pulling exact english arrays directly mapping NLP tools expecting english natively
         feedback.translated_text = simplify_document(raw, target_language='en')
         if not feedback.translated_text.startswith("Simplicity"):
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
