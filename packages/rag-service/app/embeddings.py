"""
Wraps the sentence-transformers embedding model. Loaded once per process
(via lru_cache) and reused for every request -- this is the whole reason
rag-service is a persistent FastAPI app rather than a spawn-per-request
script like predict.py: model load takes seconds, which is fine to pay once
at startup and unacceptable to pay on every call.
"""
from functools import lru_cache

from sentence_transformers import SentenceTransformer

from .config import EMBEDDING_MODEL


@lru_cache(maxsize=1)
def get_embedder() -> SentenceTransformer:
    return SentenceTransformer(EMBEDDING_MODEL)


def embed_text(text: str) -> list[float]:
    return get_embedder().encode(text, normalize_embeddings=True).tolist()


def embed_texts(texts: list[str]) -> list[list[float]]:
    return get_embedder().encode(texts, normalize_embeddings=True, show_progress_bar=False).tolist()
