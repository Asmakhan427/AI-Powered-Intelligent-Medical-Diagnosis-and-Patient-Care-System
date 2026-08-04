"""
Top-K retrieval + relevance scoring. The only module that turns a raw query
into ranked RetrievedDisease candidates -- prompt.py (Phase 3) consumes this
output, it doesn't re-query Chroma itself.
"""
from .config import TOP_K
from .embeddings import embed_text
from .schemas import RetrievedDisease
from .vectorstore import get_collection


def retrieve(query: str, top_k: int = TOP_K) -> list[RetrievedDisease]:
    collection = get_collection()
    results = collection.query(
        query_embeddings=[embed_text(query)],
        n_results=top_k,
        include=["metadatas", "documents", "distances"],
    )

    if not results["ids"][0]:
        return []

    retrieved = []
    for i in range(len(results["ids"][0])):
        distance = results["distances"][0][i]
        # Chroma's default space is L2 on normalized embeddings (range
        # roughly 0-2); map to an intuitive 0-1 "relevance" so callers reason
        # about a score, not a raw distance unit.
        relevance = max(0.0, 1.0 - distance / 2.0)
        meta = results["metadatas"][0][i]
        retrieved.append(
            RetrievedDisease(
                disease=results["ids"][0][i],
                description=results["documents"][0][i],
                specialist=meta["specialist"],
                symptoms=meta["symptoms"].split("|") if meta["symptoms"] else [],
                precautions=meta["precautions"].split("|") if meta["precautions"] else [],
                relevance=relevance,
            )
        )
    return retrieved
