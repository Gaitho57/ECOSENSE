import os
import re
import json
import joblib
from pypdf import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGULATIONS_DIR = os.path.join(BASE_DIR, "Regulations")
MODEL_DIR = os.path.join(BASE_DIR, "backend", "apps", "predictions", "ml", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

CHUNK_SIZE = 1500
OVERLAP = 200

def clean_text(text):
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def chunk_text(text, filename, page_num):
    chunks = []
    words = text.split()
    for i in range(0, len(words), CHUNK_SIZE - OVERLAP):
        chunk = " ".join(words[i:i + CHUNK_SIZE])
        if len(chunk) > 100:  # Ignore very small chunks
            chunks.append({
                "source": filename,
                "page": page_num,
                "text": chunk
            })
    return chunks

def ingest_regulations():
    print("Starting ingestion of NEMA regulations...")
    all_chunks = []
    
    if not os.path.exists(REGULATIONS_DIR):
        print(f"Error: Directory {REGULATIONS_DIR} not found.")
        return

    for filename in os.listdir(REGULATIONS_DIR):
        if not filename.lower().endswith(".pdf"):
            continue
            
        file_path = os.path.join(REGULATIONS_DIR, filename)
        print(f"Processing {filename}...")
        try:
            reader = PdfReader(file_path)
            for page_num, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    cleaned = clean_text(text)
                    all_chunks.extend(chunk_text(cleaned, filename, page_num + 1))
        except Exception as e:
            print(f"Failed to read {filename}: {e}")

    print(f"Extracted {len(all_chunks)} chunks.")
    
    if not all_chunks:
        print("No text extracted. Exiting.")
        return

    print("Vectorizing with TF-IDF...")
    texts = [c["text"] for c in all_chunks]
    vectorizer = TfidfVectorizer(stop_words='english', max_features=10000)
    tfidf_matrix = vectorizer.fit_transform(texts)

    # Save the artifacts
    print("Saving RAG artifacts...")
    joblib.dump(vectorizer, os.path.join(MODEL_DIR, "regulations_vectorizer.joblib"))
    joblib.dump(tfidf_matrix, os.path.join(MODEL_DIR, "regulations_matrix.joblib"))
    
    with open(os.path.join(MODEL_DIR, "regulations_chunks.json"), "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False)
        
    print("Ingestion complete. RAG database is ready.")

def search_regulations(query, top_k=5):
    try:
        vectorizer = joblib.load(os.path.join(MODEL_DIR, "regulations_vectorizer.joblib"))
        tfidf_matrix = joblib.load(os.path.join(MODEL_DIR, "regulations_matrix.joblib"))
        with open(os.path.join(MODEL_DIR, "regulations_chunks.json"), "r", encoding="utf-8") as f:
            all_chunks = json.load(f)
            
        query_vec = vectorizer.transform([query])
        sims = cosine_similarity(query_vec, tfidf_matrix).flatten()
        top_indices = sims.argsort()[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            if sims[idx] > 0.05:  # Relevance threshold
                results.append(all_chunks[idx])
        return results
    except Exception as e:
        print(f"Search failed: {e}")
        return []

if __name__ == "__main__":
    ingest_regulations()
