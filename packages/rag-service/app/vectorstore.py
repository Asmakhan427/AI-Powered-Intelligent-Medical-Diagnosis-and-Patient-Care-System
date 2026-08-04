"""
Owns the single Chroma client/collection handle. Both build_knowledge_base.py
(writes) and retrieval.py (reads) go through this module rather than each
opening their own PersistentClient -- one place that knows the collection
name and path.
"""
from functools import lru_cache
from typing import Any

import chromadb

from .config import CHROMA_DIR

COLLECTION_NAME = "diseases"


@lru_cache(maxsize=1)
def get_client():
    return chromadb.PersistentClient(path=str(CHROMA_DIR))


def get_or_create_collection() -> Any:
    return get_client().get_or_create_collection(
        COLLECTION_NAME, metadata={"embedding_model_versioned": "see build_knowledge_base.py"}
    )


def get_collection() -> Any:
    """Raises if the knowledge base hasn't been built yet -- fails loudly at
    request time rather than silently returning empty results."""
    try:
        return get_client().get_collection(COLLECTION_NAME)
    except ValueError as exc:
        raise RuntimeError(
            f"Chroma collection '{COLLECTION_NAME}' not found at {CHROMA_DIR}. "
            "Run scripts/build_knowledge_base.py first."
        ) from exc


def reset_collection() -> Any:
    """Used by build_knowledge_base.py for a full reindex -- drops and
    recreates so stale documents from a previous run's diseases don't linger."""
    client = get_client()
    existing = {c.name for c in client.list_collections()}
    if COLLECTION_NAME in existing:
        client.delete_collection(COLLECTION_NAME)
    return get_or_create_collection()
