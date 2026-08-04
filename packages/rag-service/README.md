# rag-service

Phase 1 (retrieval-only, no LLM) of the RAG redesign described in
[`docs/RAG_ARCHITECTURE.md`](../../docs/RAG_ARCHITECTURE.md).

## Setup

**Use a short-path virtualenv, not one nested inside this repo.**
`torch`'s packaged license files have very deeply nested paths; combined
with this repo's own nesting (`...medassist-ai\medassist-ai\packages\rag-service\...`),
installing into a venv under the repo trips Windows' 260-character `MAX_PATH`
limit (`WinError 206`). Create the venv somewhere short instead, e.g.:

```powershell
python -m venv C:\rag_venv
C:\rag_venv\Scripts\pip install -r requirements.txt
```

Also use **Python 3.11**, not whatever's newest on the machine — as of
writing, `tokenizers`/`chroma-hnswlib`/`torch` don't all have prebuilt
wheels for very new Python versions (e.g. 3.14) yet, which otherwise forces
pip to compile them from source (needs a Rust + C++ toolchain, and is slow).

## Build the knowledge base

Reads the same CSVs `../backend/ml/train_model.py` trains on; rerun
whenever those change:

```powershell
C:\rag_venv\Scripts\python scripts/build_knowledge_base.py
```

## Run

```powershell
C:\rag_venv\Scripts\python -m uvicorn app.main:app --port 8001
```

`GET /health`, `POST /analyze {"symptoms": "..."}`.

## Evaluate retrieval quality

```powershell
C:\rag_venv\Scripts\python scripts/eval_retrieval.py
```

Current numbers (25 disease-labeled cases from `ml/tests/cases.json`):
top-1 76%, top-3 88%, top-5 92%. Two consistent misses: "Fungal infection"
and "Dengue" don't surface in top-5 for their hand-written phrasing — worth
revisiting (`embedding_text` content, or the embedding model choice) before
Phase 3.

## Known gap: `RETRIEVAL_CONFIDENCE_FLOOR` doesn't catch vague input

`app/config.py`'s `RETRIEVAL_CONFIDENCE_FLOOR = 0.35` was a starting-point
guess (see `docs/RAG_ARCHITECTURE.md` section 9's own caveat about this).
In practice, `pritamdeka/S-PubMedBert-MS-MARCO` relevance scores cluster
high (~0.85-0.95) even for genuinely non-specific queries like "I feel a
bit off today" -- confirmed via `/analyze`, which returned
`insufficient_information: false` for that input. The floor needs
re-deriving from the actual score distribution on ambiguous vs. clear
queries (e.g. pick a percentile cutoff empirically) rather than a flat
guess, before Phase 3 relies on it to skip the LLM call.
