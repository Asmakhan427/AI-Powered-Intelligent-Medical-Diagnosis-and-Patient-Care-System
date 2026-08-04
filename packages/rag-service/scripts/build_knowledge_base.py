"""
Builds/rebuilds the Chroma "diseases" collection from the same source CSVs
ml/train_model.py already trains on. Run whenever ml/data/*.csv changes.

    python scripts/build_knowledge_base.py

Reuses ml/train_model.py's canonical_label_map/parse_dataset_symptoms and
ml/predict.py's load_doctor_map instead of re-deriving disease-name
normalization or doctor-map parsing here -- see docs/RAG_ARCHITECTURE.md
section 5 for why duplicating that logic would be the wrong move.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))  # so `from app...` works when run as a script

import pandas as pd  # noqa: E402

from app.config import ML_DATA_DIR  # noqa: E402  (also puts ML_DIR on sys.path)
from app.embeddings import embed_texts  # noqa: E402
from app.vectorstore import reset_collection  # noqa: E402
from train_model import canonical_label_map, parse_dataset_symptoms  # noqa: E402
from predict import load_doctor_map  # noqa: E402


def build_documents() -> list[dict]:
    dataset = pd.read_csv(ML_DATA_DIR / "dataset.csv")
    dataset["Disease"] = dataset["Disease"].str.strip()
    normalize = canonical_label_map(dataset["Disease"].unique())

    descriptions = pd.read_csv(ML_DATA_DIR / "symptom_Description.csv")
    desc_lookup = {
        str(r["Disease"]).strip().lower(): str(r["Description"]).strip()
        for _, r in descriptions.iterrows()
    }

    precautions_df = pd.read_csv(ML_DATA_DIR / "symptom_precaution.csv")
    precaution_lookup: dict[str, list[str]] = {}
    for _, row in precautions_df.iterrows():
        key = str(row["Disease"]).strip().lower()
        precaution_lookup[key] = [
            str(row[c]).strip()
            for c in precautions_df.columns[1:]
            if pd.notna(row[c]) and str(row[c]).strip()
        ]

    doctor_map = load_doctor_map()

    documents = []
    for disease, group in dataset.groupby("Disease"):
        canonical = normalize(disease)
        symptoms = sorted(
            {
                tok.strip()
                for _, row in group.iterrows()
                for tok in parse_dataset_symptoms(row).split(", ")
                if tok.strip()
            }
        )
        description = desc_lookup.get(canonical.lower(), "")
        precautions = precaution_lookup.get(canonical.lower(), [])
        specialist = doctor_map.get(canonical, "General Physician")

        # What gets embedded: description carries clinical framing, symptoms
        # carry the vocabulary a user's free-text query is likely to use --
        # both matter for retrieval quality.
        embedding_text = f"{canonical}. {description} Symptoms include: {', '.join(symptoms)}."

        documents.append(
            {
                "disease": canonical,
                "description": description,
                "symptoms": symptoms,
                "precautions": precautions,
                "specialist": specialist,
                "embedding_text": embedding_text,
            }
        )

    # correct_symptoms.csv contributes "Oral Ulcer (Canker Sore)" to
    # training but has no structured symptom/description/precaution data
    # (see ml/train_model.py's docstring) -- index it with just its label so
    # it's still retrievable, rather than silently dropping it from the KB.
    canker_sore = "Oral Ulcer (Canker Sore)"
    if not any(d["disease"] == canker_sore for d in documents):
        documents.append(
            {
                "disease": canker_sore,
                "description": "Painful sores inside the mouth.",
                "symptoms": ["mouth sores", "pain when eating"],
                "precautions": [],
                "specialist": doctor_map.get(canker_sore, "General Physician"),
                "embedding_text": f"{canker_sore}. Painful sores inside the mouth, pain when eating.",
            }
        )

    return documents


def main():
    documents = build_documents()
    print(f"Built {len(documents)} disease documents")

    embeddings = embed_texts([d["embedding_text"] for d in documents])

    collection = reset_collection()
    collection.add(
        ids=[d["disease"] for d in documents],
        embeddings=embeddings,
        metadatas=[
            {
                "specialist": d["specialist"],
                "precautions": "|".join(d["precautions"]),
                "symptoms": "|".join(d["symptoms"]),
            }
            for d in documents
        ],
        documents=[d["description"] for d in documents],
    )
    print(f"Indexed {collection.count()} documents")


if __name__ == "__main__":
    main()
