"""
Pydantic request/response models. LLM-facing schemas (AnalysisResult,
LikelyDisease) are added in Phase 3 -- this file only carries what Phase 1
(retrieval-only) needs, rather than defining shapes for a generation step
that doesn't exist yet.
"""
from pydantic import BaseModel


class DiseaseDocument(BaseModel):
    """One knowledge-base entry, as built by scripts/build_knowledge_base.py."""

    disease: str
    description: str
    symptoms: list[str]
    precautions: list[str]
    specialist: str
    embedding_text: str


class RetrievedDisease(BaseModel):
    """One candidate returned by app.retrieval.retrieve()."""

    disease: str
    description: str
    specialist: str
    symptoms: list[str]
    precautions: list[str]
    relevance: float  # 0-1, higher is more relevant


class AnalyzeRequest(BaseModel):
    symptoms: str


class RetrievalResponse(BaseModel):
    """Phase 1 response shape: retrieved candidates only, no LLM reasoning
    yet. Replaced by the full AnalysisResult-based response in Phase 3."""

    candidates: list[RetrievedDisease]
    insufficient_information: bool
