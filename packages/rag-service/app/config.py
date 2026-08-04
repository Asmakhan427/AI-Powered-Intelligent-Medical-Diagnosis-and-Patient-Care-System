"""
Env-driven settings, mirroring how packages/backend/src/config/env.ts is the
one place that owns environment configuration for the Express side -- this
is that same role for rag-service, not a second ad-hoc pattern.
"""
import os
import sys
from pathlib import Path

RAG_SERVICE_DIR = Path(__file__).parent.parent
ML_DIR = RAG_SERVICE_DIR.parent / "backend" / "ml"
ML_DATA_DIR = ML_DIR / "data"
CHROMA_DIR = Path(os.getenv("CHROMA_DIR", str(RAG_SERVICE_DIR / "chroma_db")))

# ml/'s modules (canonical_label_map, load_doctor_map, check_emergency) are
# reused rather than re-derived -- see docs/RAG_ARCHITECTURE.md sections 5
# and 8. Every module that needs one of them imports this config module
# first, so the sys.path setup happens exactly once, not once per importer.
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "pritamdeka/S-PubMedBert-MS-MARCO")

TOP_K = int(os.getenv("RAG_TOP_K", "5"))

# Starting point, not tuned -- see docs/RAG_ARCHITECTURE.md section 9 for why
# this has to be validated empirically rather than picked up front, same
# caveat as ml/predict.py's CONFIDENCE_ABSTAIN_THRESHOLD.
RETRIEVAL_CONFIDENCE_FLOOR = float(os.getenv("RETRIEVAL_CONFIDENCE_FLOOR", "0.35"))
