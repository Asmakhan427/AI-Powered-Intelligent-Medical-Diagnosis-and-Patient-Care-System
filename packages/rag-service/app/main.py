"""
FastAPI app. Phase 1 scope: retrieval only -- /analyze returns the top-K
candidate diseases and an insufficient_information flag, no LLM call yet.
Phase 3 replaces the body of analyze_symptoms with the full pipeline
(emergency check -> retrieve -> prompt -> LLM); the route contract
(POST /analyze -> JSON) does not change.
"""
from fastapi import FastAPI, HTTPException

from .config import RETRIEVAL_CONFIDENCE_FLOOR
from .retrieval import retrieve
from .schemas import AnalyzeRequest, RetrievalResponse

app = FastAPI(title="MedAssist RAG Service")


@app.post("/analyze", response_model=RetrievalResponse)
def analyze_symptoms(req: AnalyzeRequest) -> RetrievalResponse:
    if len(req.symptoms.strip()) < 3:
        raise HTTPException(400, "Symptoms description too short")

    candidates = retrieve(req.symptoms)
    insufficient = not candidates or candidates[0].relevance < RETRIEVAL_CONFIDENCE_FLOOR
    return RetrievalResponse(candidates=candidates, insufficient_information=insufficient)


@app.get("/health")
def health():
    return {"status": "ok"}
