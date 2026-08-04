"""
MedAssist AI — experimental comparison: Sentence-Transformer embeddings
(all-MiniLM-L6-v2) + LogisticRegression vs. the shipped TF-IDF +
LogisticRegression pipeline.

This script does NOT touch disease_model.pkl / vectorizer.pkl / predict.py.
Production stays TF-IDF + LogisticRegression regardless of this script's
result -- see PROJECT_REPORT.md's design-decisions section: predict.py's
explain_prediction() affords a per-term, per-class coefficient breakdown
("this word contributed this much to this diagnosis") that only exists
because the classifier is linear over an interpretable term vocabulary.
A frozen sentence embedding's 384 dimensions have no such per-word
equivalent, so switching would trade away the explainability feature this
project was specifically built to support, even if raw accuracy were equal
or better. This script exists to make that tradeoff an evidence-based
decision instead of an assumed one.

Uses the exact same StratifiedKFold splits (same RANDOM_STATE, N_FOLDS,
LOGREG_C) as train_model.py's cross_validate(), applied to both
representations in the same run, so the comparison is apples-to-apples
rather than two numbers produced by two different runs/splits.

TF-IDF is refit inside each fold (as train_model.py does) to avoid
vocabulary/IDF leakage from the held-out fold. Sentence embeddings carry no
equivalent leakage risk: all-MiniLM-L6-v2 is a frozen pretrained encoder,
never fit to this dataset, so encoding every row once up front and only
splitting the resulting vectors per fold is safe.

Run with the RAG service's venv (already has sentence-transformers
installed there -- see docs/RAG_ARCHITECTURE.md):
    C:\\rag_venv\\Scripts\\python.exe experimental\\sentence_transformer_experiment.py
"""

import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, log_loss
from sklearn.model_selection import StratifiedKFold

sys.path.insert(0, str(Path(__file__).parent.parent))
from train_model import EXTRA_STOP_WORDS, LOGREG_C, N_FOLDS, RANDOM_STATE, load_data  # noqa: E402

MODEL_NAME = "all-MiniLM-L6-v2"


def build_tfidf_vectorizer():
    return TfidfVectorizer(
        ngram_range=(1, 2),
        stop_words=list(ENGLISH_STOP_WORDS | set(EXTRA_STOP_WORDS)),
        max_features=5000,
        sublinear_tf=True,
    )


def evaluate_fold(X_train, y_train, X_test, y_test, classes):
    model = LogisticRegression(max_iter=2000, class_weight="balanced", C=LOGREG_C)
    model.fit(X_train, y_train)

    proba = model.predict_proba(X_test)
    preds = model.classes_[proba.argmax(axis=1)]

    acc = accuracy_score(y_test, preds)
    macro_f1 = f1_score(y_test, preds, average="macro", zero_division=0)
    # log_loss needs probability columns aligned to the SAME class order across
    # every fold, not just each fold's own model.classes_ (which can omit a
    # class entirely if it has too few training rows in that fold's split).
    aligned = np.zeros((len(y_test), len(classes)))
    for j, c in enumerate(model.classes_):
        aligned[:, list(classes).index(c)] = proba[:, j]
    ll = log_loss(y_test, aligned, labels=list(classes))

    return acc, macro_f1, ll


def main():
    print("Loading training data via train_model.load_data() ...")
    primary, supplementary, structured = load_data()
    full_df = pd.concat([primary, supplementary, structured], ignore_index=True)
    texts = full_df["text"].to_numpy()
    labels = full_df["label"].to_numpy()
    classes = sorted(full_df["label"].unique())
    print(f"{len(full_df)} rows, {len(classes)} classes\n")

    print(f"Encoding all rows with {MODEL_NAME} (frozen pretrained encoder, no leakage from doing this once) ...")
    t0 = time.time()
    encoder = SentenceTransformer(MODEL_NAME)
    embeddings = encoder.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    encode_seconds = time.time() - t0
    print(f"Encoded {len(texts)} rows in {encode_seconds:.1f}s ({embeddings.shape[1]}-dim vectors)\n")

    skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_STATE)

    tfidf_metrics, embed_metrics = [], []
    tfidf_seconds, embed_seconds = 0.0, 0.0

    for fold, (train_idx, test_idx) in enumerate(skf.split(texts, labels), start=1):
        t0 = time.time()
        vectorizer = build_tfidf_vectorizer()
        X_train = vectorizer.fit_transform(texts[train_idx])
        X_test = vectorizer.transform(texts[test_idx])
        tfidf_metrics.append(evaluate_fold(X_train, labels[train_idx], X_test, labels[test_idx], classes))
        tfidf_seconds += time.time() - t0

        t0 = time.time()
        embed_metrics.append(
            evaluate_fold(
                embeddings[train_idx], labels[train_idx], embeddings[test_idx], labels[test_idx], classes
            )
        )
        embed_seconds += time.time() - t0

        print(
            f"Fold {fold}/{N_FOLDS} -- "
            f"TF-IDF: acc={tfidf_metrics[-1][0]:.2%} f1={tfidf_metrics[-1][1]:.4f} logloss={tfidf_metrics[-1][2]:.4f} | "
            f"MiniLM: acc={embed_metrics[-1][0]:.2%} f1={embed_metrics[-1][1]:.4f} logloss={embed_metrics[-1][2]:.4f}"
        )

    def summarize(name, metrics, seconds):
        arr = np.array(metrics)
        print(
            f"\n{name}: "
            f"accuracy={arr[:, 0].mean():.4f} (+/-{arr[:, 0].std():.4f})  "
            f"macro_f1={arr[:, 1].mean():.4f} (+/-{arr[:, 1].std():.4f})  "
            f"log_loss={arr[:, 2].mean():.4f} (+/-{arr[:, 2].std():.4f})  "
            f"fit+predict_time={seconds:.1f}s"
        )

    print("\n=== Summary (same folds, same LOGREG_C, both pipelines) ===")
    summarize("TF-IDF + LogisticRegression (shipped)", tfidf_metrics, tfidf_seconds)
    summarize(f"{MODEL_NAME} + LogisticRegression (experimental)", embed_metrics, embed_seconds)
    print(f"\n{MODEL_NAME} encoding time (one-time, all rows): {encode_seconds:.1f}s")


if __name__ == "__main__":
    main()
