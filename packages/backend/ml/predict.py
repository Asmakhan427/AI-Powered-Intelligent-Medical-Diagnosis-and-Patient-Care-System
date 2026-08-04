"""
MedAssist AI — symptom prediction CLI bridge.

Invoked by packages/backend/src/services/python.service.ts as:
    python predict.py "<free-text symptom description>"

Prints a single JSON object on stdout matching PythonPredictionResult:
    { disease, confidence, severity, emergency, doctor, reason, description,
      recommendations, differentials, symptomsDetected, explanation }

Loads disease_model.pkl + vectorizer.pkl (produced by train_model.py) once
per invocation — see python.service.ts for why this is a short-lived
process per request rather than a long-running server: it mirrors the
original server.js behavior and keeps the Node/Python boundary simple, at
the cost of paying model-load time on every call. Fine for this app's
volume; revisit with a persistent Python process (e.g. a small Flask/FastAPI
sidecar) if that ever becomes a bottleneck.
"""

import json
import re
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from emergency import category_scores, check_emergency
from phrase_matching import compile_phrase_alternation
from text_normalize import normalize_symptom_text

ML_DIR = Path(__file__).parent

SEVERITY_THRESHOLDS = [
    (22, "CRITICAL"),
    (15, "SEVERE"),
    (7, "MODERATE"),
]

# Below this, the top prediction isn't trustworthy enough to state as a
# diagnosis-shaped answer (see determine_severity's caller in main()) — with
# overlapping classes, a wrong prediction can still land at a deceptively
# high raw probability, so "top score, whatever it is" is not a safe thing
# to show a user in a medical app.
#
# Lowered from 0.45 (tuned for the old 24-class model) after expanding to 41
# diseases: with more classes sharing overlapping symptom vocabulary,
# probability mass spreads thinner even for genuinely correct top-1 picks
# (e.g. a classic "gnawing upper-stomach pain, worse on empty stomach"
# description for Peptic ulcer calibrates to ~27%, correctly beating GERD's
# ~25%, but would have been wrongly abstained under the old threshold).
# 0.3 is still a starting point, not tuned against a held-out validation
# set -- and no single global threshold can fully separate "correct but
# modest" from "wrong but confident" when two diseases genuinely present
# almost identically in free text (e.g. Malaria vs Typhoid, both febrile
# illnesses following similar prodromes) -- that residual ambiguity is
# inherent to the 41-class problem, not a tuning bug, and is exactly what
# the differentials list and Uncertain fallback exist to surface honestly
# rather than paper over. Revisit once real usage data exists.
CONFIDENCE_ABSTAIN_THRESHOLD = 0.25
UNCERTAIN_DIAGNOSIS = "Uncertain — please consult a doctor for evaluation"

# What the disease/doctor fields show when check_emergency() has already
# fired. Without this, main() picked a doctor purely from classifier
# confidence with no regard for the emergency flag -- a chest-pain input
# that also happens to classify as GERD at 50% confidence got routed to a
# Gastroenterologist while simultaneously being marked CRITICAL/emergency,
# which undercuts the emergency banner instead of reinforcing it.
EMERGENCY_DIAGNOSIS = "Emergency — seek immediate medical attention"

# Common phrasings that don't literally contain the Symptom-severity.csv
# key they describe, so the original substring match silently missed them
# (e.g. "sore throat" never matches "patches_in_throat" or
# "throat_irritation"; "my head aches" never matches "headache"). Mapped to
# the SAME weight as their canonical entry via build_symptom_patterns()
# below, and matched with a word-boundary regex OR'd across all variants so
# a single mention of the concept is scored once — not missed, and not
# double-counted if the user happens to use two synonyms at once.
SEVERITY_SYNONYMS: dict[str, list[str]] = {
    "headache": ["head ache", "head aches", "head hurts", "head hurting", "head pain"],
    "high fever": ["high temperature", "very high fever"],
    "mild fever": ["low grade fever", "slight fever", "low fever"],
    "stomach pain": ["stomach ache", "stomachache", "tummy pain", "belly ache"],
    "abdominal pain": ["tummy ache"],
    "throat irritation": ["sore throat", "scratchy throat"],
    "vomiting": ["throwing up", "vomited"],
    "nausea": ["nauseous", "feel sick", "feeling sick", "queasy"],
    "cough": ["coughing"],
    "breathlessness": ["shortness of breath", "short of breath", "out of breath"],
    "chest pain": ["pain in chest", "chest hurts"],
    "back pain": ["backache"],
    "neck pain": ["sore neck", "stiff neck ache"],
    "joint pain": ["achy joints", "joints ache", "joints hurt"],
    "muscle pain": ["muscle ache", "body ache", "body aches"],
    "dizziness": ["dizzy", "light headed", "lightheaded"],
    "fatigue": ["exhausted", "worn out", "no energy"],
    "runny nose": ["nose is running", "runny nostrils"],
    "diarrhoea": ["diarrhea", "loose motions", "loose stools"],
    "loss of appetite": ["not hungry", "no appetite"],
    "weakness in limbs": ["weak limbs", "limbs feel weak"],
}


def load_severity_weights():
    df = pd.read_csv(ML_DIR / "data" / "Symptom-severity.csv")
    df.columns = [c.strip() for c in df.columns]
    weights = {}
    for _, row in df.iterrows():
        symptom = str(row["Symptom"]).strip().lower()
        if not symptom or symptom == "nan":
            continue
        # "skin_rash" -> "skin rash", so it can be substring-matched
        # against free-text input the way a user would actually phrase it.
        phrase = symptom.replace("_", " ")
        weights[phrase] = int(row["weight"])
    return weights


def build_symptom_patterns(severity_weights: dict) -> dict:
    """canonical phrase -> compiled regex matching that phrase or any of
    its known synonyms, word-boundary delimited so "ear ache" doesn't
    match inside an unrelated longer word."""
    return {
        phrase: compile_phrase_alternation([phrase] + SEVERITY_SYNONYMS.get(phrase, []))
        for phrase in severity_weights
    }


def load_doctor_map():
    with open(ML_DIR / "doctor_map.json") as f:
        raw = json.load(f)
    return {k: v for k, v in raw.items() if not k.startswith("_")}


# Keyword -> specialist fallback, used when a disease has no doctor_map.json
# entry or the model is Uncertain (nothing to look up). Mirrors
# ai.controller.ts's KEYWORD_DOCTOR_MAP -- kept in sync manually since one is
# TS and the other Python.
KEYWORD_DOCTOR_MAP = {
    "heart": "Cardiologist",
    "cardiac": "Cardiologist",
    "stroke": "Neurologist",
    "brain": "Neurologist",
    "migraine": "Neurologist",
    "headache": "Neurologist",
    "lung": "Pulmonologist",
    "asthma": "Pulmonologist",
    "breathing": "Pulmonologist",
    "stomach": "Gastroenterologist",
    "abdominal": "Gastroenterologist",
    "liver": "Gastroenterologist",
    "skin": "Dermatologist",
    "rash": "Dermatologist",
    "joint": "Rheumatologist",
    "arthritis": "Rheumatologist",
    "urine": "Urologist",
    "kidney": "Urologist",
    "child": "Pediatrician",
    "baby": "Pediatrician",
    "infection": "Infectious Disease Specialist",
    "fever": "General Physician",
    "cold": "General Physician",
    "cough": "General Physician",
}


def display_label(label: str) -> str:
    """Canonical training labels are dataset.csv's spelling, which is
    consistently capitalized except for "hepatitis A" -- fix that one case
    without reformatting labels like "GERD" or "AIDS" that are correct as-is."""
    return label[0].upper() + label[1:] if label and label[0].islower() else label


def resolve_doctor(disease: str | None, symptoms_lower: str, doctor_map: dict) -> tuple[str, str]:
    """disease=None means the prediction was Uncertain -- there's no label to
    look up, so go straight to the keyword fallback."""
    if disease is not None:
        mapped = doctor_map.get(disease)
        if mapped:
            return mapped, f"Specialist for {display_label(disease)}"

    for keyword, specialist in KEYWORD_DOCTOR_MAP.items():
        if keyword in symptoms_lower:
            return specialist, "Based on the symptoms you described"

    return "General Physician", "General evaluation recommended"


def load_precautions():
    # symptom_precaution.csv comes from the same source as dataset.csv and
    # uses identical disease spelling (including its typos), which is now
    # also what training labels are normalized to -- a plain lowercase
    # lookup is enough, no per-disease aliasing needed.
    df = pd.read_csv(ML_DIR / "data" / "symptom_precaution.csv")
    lookup = {}
    for _, row in df.iterrows():
        key = str(row["Disease"]).strip().lower()
        precautions = [
            str(row[c]).strip()
            for c in df.columns[1:]
            if pd.notna(row[c]) and str(row[c]).strip()
        ]
        lookup[key] = precautions
    return lookup


def load_descriptions():
    # symptom_Description.csv spells "Dimorphic hemmorhoids(piles)" without
    # the doubled m ("hemorrhoids") -- the only label that differs from
    # dataset.csv/symptom_precaution.csv's spelling, which training labels
    # are normalized to. Bridged with one explicit alias; everything else
    # matches via plain lowercase lookup.
    df = pd.read_csv(ML_DIR / "data" / "symptom_Description.csv")
    lookup = {}
    for _, row in df.iterrows():
        key = str(row["Disease"]).strip().lower()
        lookup[key] = str(row["Description"]).strip()

    if "dimorphic hemorrhoids(piles)" in lookup:
        lookup["dimorphic hemmorhoids(piles)"] = lookup["dimorphic hemorrhoids(piles)"]

    return lookup


def get_description(disease: str, descriptions: dict) -> str | None:
    return descriptions.get(disease.strip().lower())


def _titlecase_symptom(phrase: str) -> str:
    return phrase[0].upper() + phrase[1:]


def determine_severity(
    symptoms_lower: str, severity_weights: dict, symptom_patterns: dict
) -> tuple[str, bool, list[str]]:
    """Returns (severity_level, is_emergency, symptoms_detected). The matched-
    phrase list is computed once here and reused both to score severity and
    as the symptom-extraction layer surfaced to the caller -- rather than
    matching the same patterns twice in two separate functions."""
    matched = [
        phrase for phrase in severity_weights if symptom_patterns[phrase].search(symptoms_lower)
    ]

    # Bare "fever" (no severity qualifier) isn't itself a Symptom-severity.csv
    # key -- only "high fever" / "mild fever" are -- so without this an
    # unqualified "I have a fever" scores 0 for it entirely. Only add it when
    # neither qualified form already matched, so a mention of "high fever"
    # doesn't also get scored again for the bare word "fever" it contains.
    already_scored_fever = "high fever" in matched or "mild fever" in matched
    bare_fever = not already_scored_fever and bool(re.search(r"\bfevers?\b", symptoms_lower))
    if bare_fever:
        matched.append("mild fever")

    # A bare "fever" mention only borrows "mild fever"'s weight to avoid
    # scoring it as zero -- display it to the user as the generic "fever"
    # they actually said, not the more specific "mild fever" label that was
    # never actually stated.
    symptoms_detected = sorted(
        _titlecase_symptom("fever" if phrase == "mild fever" and bare_fever else phrase)
        for phrase in matched
    )

    # Computed after matching, not before -- an emergency result should
    # still surface what was detected (the frontend shows both together),
    # rather than reporting no symptoms just because check_emergency's own,
    # separate scoring fired first.
    if check_emergency(symptoms_lower):
        return "CRITICAL", True, symptoms_detected

    score = sum(severity_weights[phrase] for phrase in matched)

    # A high statistical score means the symptoms sound severe (useful for
    # the severity level shown to the user) -- it does NOT mean this is one
    # of the specific rule-matched emergencies emergency.py knows about.
    # Treating "score happens to cross the CRITICAL cutoff" as equivalent to
    # "emergency" was a second, accidental emergency-detection path that
    # bypassed check_emergency() entirely (e.g. fever+cough+chest pain+
    # phlegm statistically totals CRITICAL for a Pneumonia case with no
    # actual red-flag combination present). emergency.py is the only
    # authority on that question; this function only decides severity.
    for threshold, level in SEVERITY_THRESHOLDS:
        if score >= threshold:
            return level, False, symptoms_detected
    return "MILD", False, symptoms_detected


def get_recommendations(disease: str, precautions: dict) -> str:
    matched = precautions.get(disease.strip().lower())
    if matched:
        return "Recommended precautions: " + "; ".join(matched) + "."
    return "Consult a doctor for a full evaluation and personalized treatment plan."


def _average_coefficients(model) -> np.ndarray:
    """CalibratedClassifierCV fits 5 internal LogisticRegression clones (one
    per CV fold, see train_model.py) and calibrates across them -- for the
    human-readable explanation below (not for the prediction itself, which
    already uses predict_proba correctly), average their coefficients for a
    more stable "why" than any single fold's fit."""
    return np.mean([cc.estimator.coef_ for cc in model.calibrated_classifiers_], axis=0)


def explain_differential(
    vectorizer, coefficients: np.ndarray, class_index: dict, features, disease: str, top_n: int = 5
) -> list[list]:
    """[term, contribution] pairs -- contribution is exactly the term's
    (tfidf weight x that class's coefficient) product, i.e. the same
    arithmetic LogisticRegression itself sums to reach its decision score,
    just surfaced per-term instead of only as the final summed value. This
    is the honest explanation a linear model affords that a black-box one
    wouldn't -- see the module docstring's ongoing "why classical ML"
    rationale."""
    row = features.toarray()[0]
    col = coefficients[class_index[disease]]
    contributions = [(term, row[j] * col[j]) for term, j in vectorizer.vocabulary_.items() if row[j] != 0]
    contributions.sort(key=lambda t: t[1], reverse=True)
    return [[term, round(float(value), 4)] for term, value in contributions[:top_n]]


def explain_prediction(vectorizer, model, features, differentials: list[dict]) -> dict:
    """Ties together, for the query just classified: which vocabulary it
    actually matched, each differential's top contributing terms, and a
    plain-language reason -- so "why this disease" and "why not the others"
    are answerable from the response itself instead of trusting a single
    opaque confidence number."""
    matched_symptoms = sorted(vectorizer.inverse_transform(features)[0].tolist())
    coefficients = _average_coefficients(model)
    class_index = {label: i for i, label in enumerate(model.classes_)}

    top_disease = differentials[0]["disease"] if differentials else None
    evidence = []
    for i, entry in enumerate(differentials):
        disease = entry["disease"]
        # differentials' labels are already display_label()-formatted;
        # class_index is keyed by the raw training label -- canonical
        # labels only differ from their display form by a leading-letter
        # case fix (see display_label), so this direct lookup is enough
        # except for that one case, handled by falling back to a
        # case-insensitive match.
        raw_label = disease if disease in class_index else next(
            (c for c in class_index if c.lower() == disease.lower()), disease
        )
        terms = explain_differential(vectorizer, coefficients, class_index, features, raw_label)
        if i == 0:
            reason = (
                f"Selected as the most likely match: {', '.join(t for t, _ in terms) or 'overall wording'} "
                f"contributed most strongly to {disease}, for {entry['confidence']}% calibrated confidence."
            )
        else:
            reason = (
                f"Considered but ranked below {top_disease}: matched terms contributed less strongly to "
                f"{disease} ({entry['confidence']}% vs {differentials[0]['confidence']}%)."
            )
        evidence.append({"disease": disease, "confidence": entry["confidence"], "top_terms": terms, "reason": reason})

    return {"matched_symptoms": matched_symptoms, "differential_evidence": evidence}


def main():
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        print(json.dumps({"error": "No symptoms provided"}), file=sys.stderr)
        sys.exit(1)

    symptoms = sys.argv[1]
    symptoms_lower = re.sub(r"\s+", " ", symptoms.lower()).strip()

    model = joblib.load(ML_DIR / "disease_model.pkl")
    vectorizer = joblib.load(ML_DIR / "vectorizer.pkl")
    doctor_map = load_doctor_map()
    severity_weights = load_severity_weights()
    symptom_patterns = build_symptom_patterns(severity_weights)
    precautions = load_precautions()
    descriptions = load_descriptions()

    # Normalized separately from symptoms_lower -- severity/emergency must
    # keep matching exactly what the user typed (see text_normalize.py's
    # docstring); only the classifier's input goes through this.
    features = vectorizer.transform([normalize_symptom_text(symptoms)])
    probabilities = model.predict_proba(features)[0]
    best_idx = probabilities.argmax()
    disease = model.classes_[best_idx]
    confidence = round(float(probabilities[best_idx]) * 100, 1)

    # Top-3 differential diagnoses, independent of the abstention gate below
    # -- clinically, "here are the leading candidates" is a more honest and
    # more useful answer than a single fabricated-sounding label, whether or
    # not the top one clears the confidence threshold.
    top_idx = probabilities.argsort()[::-1][:3]
    differentials = [
        {
            "disease": display_label(str(model.classes_[i])),
            "confidence": round(float(probabilities[i]) * 100, 1),
        }
        for i in top_idx
    ]

    severity, emergency, symptoms_detected = determine_severity(
        symptoms_lower, severity_weights, symptom_patterns
    )

    # A red-flag emergency overrides the classifier's disease guess entirely
    # -- checked first, before the confidence gate below. A small text
    # classifier confidently naming a specific (and possibly wrong) disease
    # is exactly the wrong thing to show alongside a CRITICAL/emergency
    # result; it reads as "never mind the alarm, it's just GERD." The
    # differentials computed above are untouched, so a doctor triaging this
    # can still see what the classifier considered.
    if emergency:
        recommendations = "Seek immediate medical attention. Call emergency services or go to the nearest ER now."
        description = None
        doctor, reason = resolve_doctor(None, symptoms_lower, doctor_map)
        disease = EMERGENCY_DIAGNOSIS
    # Below CONFIDENCE_ABSTAIN_THRESHOLD, don't present the top class as if
    # it were a diagnosis -- with overlapping classes and a small training
    # set, a wrong prediction can still land at 60-80% raw probability. The
    # true confidence is still reported so the caller can show it, but the
    # disease label and doctor recommendation route to a safe default
    # instead of a specific (possibly wrong) condition.
    elif probabilities[best_idx] < CONFIDENCE_ABSTAIN_THRESHOLD:
        recommendations = get_recommendations(UNCERTAIN_DIAGNOSIS, precautions)
        description = None
        doctor, reason = resolve_doctor(None, symptoms_lower, doctor_map)
        disease = UNCERTAIN_DIAGNOSIS
    else:
        recommendations = get_recommendations(disease, precautions)
        description = get_description(disease, descriptions)
        doctor, reason = resolve_doctor(disease, symptoms_lower, doctor_map)
        disease = display_label(str(disease))

    # Reuses emergency.py's own scoring function directly rather than
    # recomputing anything -- these are the exact per-category totals
    # check_emergency() already based its True/False decision on.
    explanation = explain_prediction(vectorizer, model, features, differentials)
    explanation["emergency_scores"] = category_scores(symptoms_lower)

    result = {
        "disease": str(disease),
        "confidence": confidence,
        "severity": severity,
        "emergency": emergency,
        "doctor": doctor,
        "reason": reason,
        "description": description,
        "recommendations": recommendations,
        "differentials": differentials,
        "symptomsDetected": symptoms_detected,
        "explanation": explanation,
    }
    print(json.dumps(result))


if __name__ == "__main__":
    main()
