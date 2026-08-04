"""
MedAssist AI — symptom-to-disease classifier training script.

Run once (or whenever ml/data/*.csv changes) to regenerate the .pkl
artifacts predict.py loads at inference time:

    python train_model.py

Data:
  - Symptom2Disease.csv: 1200 free-text symptom descriptions across 24
    diseases — the primary training set, and the one free-text accuracy is
    measured against (matches the app's actual input: a free-text textarea,
    not a checkbox list). Its Migraine rows were originally mislabeled
    (describing GERD/vision/mood symptoms rather than headaches), which made
    real migraine descriptions misclassify as Malaria; they've since been
    replaced with real classic-presentation text (throbbing/one-sided
    headache, photophobia, phonophobia, nausea, aura).
  - correct_symptoms.csv: a small supplementary set covering conditions not
    present in Symptom2Disease.csv. Classes with fewer than 5 examples were
    dropped entirely (Oral Thrush, Aphthous Ulcer, Cold Sore, Gastritis,
    Epistaxis, Gastroenteritis) — a class trained on 1-2 examples doesn't
    learn anything, it just adds noise that can hijack unrelated
    predictions. Only "Oral Ulcer (Canker Sore)" (6 examples) remains, and
    is folded into training only, same as before: still too few examples to
    carve out its own held-out split.
  - dataset.csv: 4920 rows of Disease + up to 17 discrete Symptom_n checkbox
    columns, spanning 41 diseases — 17 of which (AIDS, Hepatitis A-E, Heart
    attack, Tuberculosis, Hypothyroidism, ...) never appeared in the two
    free-text sources above, so the shipped model was capped at 24-25
    classes while this data sat unused. Each row's symptom tokens are turned
    into a short pseudo-natural-language string ("skin_rash" -> "skin rash")
    so it can be merged into the same [text, label] shape as the free-text
    sources and trained with one shared vectorizer/model.
  - Labels are normalized to dataset.csv's spelling (see
    canonical_label_map() below) since symptom_Description.csv and
    symptom_precaution.csv also key off dataset.csv's labels — one join key
    instead of three label dialects across the free-text and checkbox
    sources.

Model: TF-IDF (unigrams + bigrams) -> LogisticRegression, wrapped in
CalibratedClassifierCV so predict_proba is actually calibrated (plain
LogisticRegression probabilities look calibrated but aren't, once classes
overlap as heavily as they do here — the app reports predict_proba directly
as the user-facing confidence %, so an uncalibrated score means confidently
wrong answers).

Calibration method is "sigmoid" (Platt scaling), not "isotonic". Isotonic
was tried first (matching what this script already used for the 24-class
free-text-only model) but produces badly degenerate curves once the classes
include dataset.csv's near-duplicate structured rows: isotonic regression
fits an arbitrary step function per class from only ~1/5th of each class's
samples per internal calibration fold, and with 42 now-easily-separable
classes it was observed to turn an honest ~5-8% raw score for an unrelated
class into a fabricated 50-60% "confidence" -- e.g. "my blood pressure has
been running high and I get headaches and dizziness" calibrated to 58%
Varicose veins even though the raw model didn't rank it top-3. Sigmoid's
two-parameter logistic curve can't produce that kind of spike and degrades
far more gracefully with fewer per-class calibration samples.

Accuracy is measured with stratified k-fold CV, refitting the vectorizer
inside each fold (no vocabulary leakage from the held-out fold into TF-IDF's
IDF weights) — once on Symptom2Disease.csv alone (comparable to the old
24-class baseline) and once on the combined free-text + dataset.csv set
(what actually ships). A single 80/20 split was dropped because
dataset.csv's 120-rows-per-disease are combinations of a small number of
core symptoms, so class sizes are still modest even after load_data()'s
exact-duplicate removal below — one split could land lucky or unlucky;
k-fold reports a mean and spread instead of one point estimate that's easy
to over-read.
"""

import json
import re

import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import StratifiedKFold

from text_normalize import normalize_symptom_text

DATA_DIR = Path(__file__).parent / "data"
OUT_DIR = Path(__file__).parent

RANDOM_STATE = 42
N_FOLDS = 5

# class_weight="balanced" gives every class equal total weight in the loss
# (n_samples / n_classes, a constant), regardless of that class's row count.
# Deduplicating exact-duplicate rows in load_data() shrank the total sample
# count ~4x (6158 -> 1497), which shrinks that per-class weight budget by the
# same ~4x -- but LogisticRegression's L2 regularization term ((1/C)*||coef||^2)
# doesn't automatically rescale with it, so the same C=1.0 that fit the
# pre-dedup data leaves regularization relatively ~4x stronger post-dedup,
# systematically underfitting. A leakage-free 5-fold CV grid search over
# C in [1, 3, 10, 30, 100, 300, 500, 1000, 2000, 5000] against the ACTUAL
# shipped architecture (LogisticRegression -> CalibratedClassifierCV, not
# the raw uncalibrated model) found log loss bottoming out at C=500 (0.3294)
# and accuracy/macro-F1 peaking at C=1000 (0.9719/0.9763), with clear
# overfitting decline by C=2000 (log loss back up to 0.3739). C=500 is
# picked over C=1000 because it's simultaneously near-optimal on every
# metric measured (log loss, accuracy, macro-F1, macro-recall) rather than
# trading one for a small gain in another, and is the less extreme value
# between two comparably-performing candidates.
LOGREG_C = 500

# sklearn's built-in "english" stop-word list doesn't include "feel" (or its
# inflections), yet it carries a surprisingly large positive coefficient for
# Diabetes specifically (+3.39 at C=500) despite appearing broadly across
# 20+ classes in training text (Diabetes 22, Peptic ulcer diseae 21, Common
# Cold 20, Dengue 18, ...) -- confirmed directly, not assumed, by inspecting
# per-token TF-IDF*coefficient contributions. The practical failure mode: a
# near-empty, genuinely non-diagnostic query ("I feel a bit off today,
# nothing specific I can point to") still clears the confidence-abstention
# threshold on the strength of this one filler word alone. Verified via
# leakage-free CV that excluding it (and its inflections) changes overall
# accuracy/macro-F1/weighted-F1 by <0.2 points (0.9713->0.9693,
# 0.9758->0.9746, 0.9712->0.9692) -- noise-level, not a real capability
# loss -- while dropping that specific query's confidence from 25.5% to
# 7.8%, correctly triggering abstention instead of a confident-sounding
# guess. Bigrams like "feel fatigue"/"feel nausea" are lost as bigrams by
# this (stop words are stripped before n-grams form), but the informative
# unigram ("fatigue", "nausea") already carries that signal on its own.
EXTRA_STOP_WORDS = ["feel", "feeling", "feels", "felt"]

# Symptom2Disease.csv / correct_symptoms.csv spell a few of these differently
# than dataset.csv ("gastroesophageal reflux disease" vs "GERD"); dataset.csv's
# spelling wins since symptom_Description.csv and symptom_precaution.csv also
# key off it. Everything else matches dataset.csv already once lowercased
# (handled generically in canonical_label_map, not listed here).
EXPLICIT_LABEL_ALIASES = {
    "dimorphic hemorrhoids": "Dimorphic hemmorhoids(piles)",
    "gastroesophageal reflux disease": "GERD",
    "peptic ulcer disease": "Peptic ulcer diseae",
}


def canonical_label_map(dataset_diseases):
    """Returns a function mapping any free-text label to dataset.csv's
    spelling of the same disease, or the label unchanged if dataset.csv has
    no equivalent (e.g. "Oral Ulcer (Canker Sore)", which only exists in
    correct_symptoms.csv)."""
    by_lower = {d.lower(): d for d in dataset_diseases}

    def normalize(label: str) -> str:
        key = label.strip().lower()
        return EXPLICIT_LABEL_ALIASES.get(key) or by_lower.get(key) or label.strip()

    return normalize


def parse_dataset_symptoms(row: pd.Series) -> str:
    """"skin_rash", "high_fever", ... -> "skin rash, high fever" — turns a
    dataset.csv row's checkbox columns into a short pseudo-natural-language
    string in the same shape as the free-text training rows."""
    tokens = []
    for col in row.index:
        if not col.startswith("Symptom_") or pd.isna(row[col]):
            continue
        token = re.sub(r"\s+", " ", str(row[col]).strip().replace("_", " ")).strip()
        if token:
            tokens.append(token)
    return ", ".join(tokens)


def load_data():
    primary = pd.read_csv(DATA_DIR / "Symptom2Disease.csv")
    primary = primary[["label", "text"]].dropna()

    supplementary = pd.read_csv(DATA_DIR / "correct_symptoms.csv")
    supplementary = supplementary[["label", "text"]].dropna()

    structured = pd.read_csv(DATA_DIR / "dataset.csv")
    structured["Disease"] = structured["Disease"].str.strip()
    normalize = canonical_label_map(structured["Disease"].unique())

    structured_rows = pd.DataFrame(
        {
            "label": structured["Disease"],
            "text": structured.apply(parse_dataset_symptoms, axis=1),
        }
    )
    structured_rows = structured_rows[structured_rows["text"].str.len() > 0]

    primary["label"] = primary["label"].map(normalize)
    supplementary["label"] = supplementary["label"].map(normalize)

    # Normalize surface phrasing (burns/burning, eating/meals, ...) to a
    # canonical form BEFORE it reaches the vectorizer -- predict.py applies
    # the exact same normalization to the user's query, so both sides of
    # TF-IDF see consistent vocabulary regardless of how either is phrased.
    # See text_normalize.py's docstring for why this must happen on both
    # the training text and the query, not just one.
    primary["text"] = primary["text"].map(normalize_symptom_text)
    supplementary["text"] = supplementary["text"].map(normalize_symptom_text)
    structured_rows["text"] = structured_rows["text"].map(normalize_symptom_text)

    # dataset.csv's 4920 rows are actually ~300 unique symptom combinations
    # padded with exact repeats (e.g. one Fungal infection combination
    # appears 72 times, byte-for-byte identical); Symptom2Disease.csv has a
    # handful of the same issue. Deduplicating here -- the one place every
    # caller (both CV passes and the final fit) goes through -- matters for
    # two reasons: (1) StratifiedKFold splits by row index, so an exact
    # duplicate can land in one fold's train set and another fold's test
    # set, letting the model "test" on text it just trained on and
    # inflating reported CV accuracy without reflecting real generalization;
    # (2) a duplicated row acts as an implicit sample weight in
    # LogisticRegression's loss (10 identical copies count as strongly as
    # sample_weight=10), silently overweighting whichever combination
    # dataset.csv happened to repeat most, independently of
    # class_weight="balanced" (which corrects for class-level imbalance, not
    # within-class duplication). No cross-source duplicate text exists
    # (verified directly), so per-source deduplication is sufficient --
    # there's no need for a full_df-level pass on top of this.
    primary = primary.drop_duplicates(subset="text", keep="first").reset_index(drop=True)
    supplementary = supplementary.drop_duplicates(subset="text", keep="first").reset_index(drop=True)
    structured_rows = structured_rows.drop_duplicates(subset="text", keep="first").reset_index(drop=True)

    return primary, supplementary, structured_rows


def build_vectorizer():
    return TfidfVectorizer(
        ngram_range=(1, 2),
        stop_words=list(ENGLISH_STOP_WORDS | set(EXTRA_STOP_WORDS)),
        max_features=5000,
        sublinear_tf=True,
    )


def cross_validate(df: pd.DataFrame, description: str) -> None:
    """Stratified k-fold CV on the given set, printed as an honest
    generalization estimate (not the number that ships)."""
    texts = df["text"].to_numpy()
    labels = df["label"].to_numpy()

    skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    fold_accuracies = []
    all_true, all_pred = [], []

    for fold, (train_idx, test_idx) in enumerate(skf.split(texts, labels), start=1):
        vectorizer = build_vectorizer()
        X_train = vectorizer.fit_transform(texts[train_idx])
        X_test = vectorizer.transform(texts[test_idx])

        model = LogisticRegression(max_iter=2000, class_weight="balanced", C=LOGREG_C)
        model.fit(X_train, labels[train_idx])

        preds = model.predict(X_test)
        acc = accuracy_score(labels[test_idx], preds)
        fold_accuracies.append(acc)
        all_true.extend(labels[test_idx])
        all_pred.extend(preds)
        print(f"  Fold {fold}/{N_FOLDS} accuracy: {acc:.2%}")

    fold_accuracies = np.array(fold_accuracies)
    print(
        f"\n{N_FOLDS}-fold CV accuracy on {description}: "
        f"{fold_accuracies.mean():.2%} (+/- {fold_accuracies.std():.2%})"
    )
    print(classification_report(all_true, all_pred, zero_division=0))


def main():
    primary, supplementary, structured = load_data()

    # Two CV passes tell two different stories: free-text-only matches the
    # app's actual input distribution (a textarea, not checkboxes) and is
    # comparable to the old 24-class baseline; the combined pass is the
    # number that reflects what actually ships (41+ classes). Reporting only
    # one would hide either the real-world accuracy or the class-coverage
    # gain.
    print(f"Cross-validating on {len(primary)} free-text rows, {primary['label'].nunique()} classes ({N_FOLDS}-fold)...")
    cross_validate(primary, "Symptom2Disease.csv (free-text only)")

    full_df = pd.concat([primary, supplementary, structured], ignore_index=True)
    print(
        f"\nCross-validating on {len(full_df)} combined rows, "
        f"{full_df['label'].nunique()} classes ({N_FOLDS}-fold)..."
    )
    cross_validate(full_df, "combined free-text + dataset.csv")

    # Final artifact ships on every available row — the CV above exists only
    # to measure generalization, not to withhold data from the deployed
    # model. Wrapped in CalibratedClassifierCV so the confidence %
    # predict.py reports is trustworthy rather than just LogisticRegression's
    # raw (uncalibrated, prone-to-overconfidence) score.
    final_vectorizer = build_vectorizer()
    X_full = final_vectorizer.fit_transform(full_df["text"])

    base_model = LogisticRegression(max_iter=2000, class_weight="balanced", C=LOGREG_C)
    # cv=5 (was the default) requires every class to have >=5 examples in
    # each of ITS OWN internal calibration folds -- infeasible now that
    # load_data() deduplicates exact-duplicate rows: Oral Ulcer (Canker
    # Sore) has only 6 total examples, so cv=5 raised
    # "Requesting 5-fold cross-validation but provided less than 5 examples
    # for at least one class" outright. cv=3 is the smallest fold count that
    # still runs across every class post-dedup and was validated (not just
    # assumed) against the same leakage-free CV grid search noted above.
    calibrated_model = CalibratedClassifierCV(base_model, cv=3, method="sigmoid")
    calibrated_model.fit(X_full, full_df["label"])

    joblib.dump(calibrated_model, OUT_DIR / "disease_model.pkl")
    joblib.dump(final_vectorizer, OUT_DIR / "vectorizer.pkl")
    print(f"\nSaved disease_model.pkl and vectorizer.pkl to {OUT_DIR}")
    print(f"Classes ({len(calibrated_model.classes_)}): {sorted(calibrated_model.classes_)}")

    # Sanity-check every trained class has a doctor_map.json entry — a
    # missing one silently falls back to General Physician at inference
    # time, which is a real behavior change worth catching here instead.
    with open(OUT_DIR / "doctor_map.json") as f:
        doctor_map = json.load(f)
    unmapped = [c for c in calibrated_model.classes_ if c not in doctor_map]
    if unmapped:
        print(f"\nWARNING: classes with no doctor_map.json entry (will default to General Physician): {unmapped}")


if __name__ == "__main__":
    main()
