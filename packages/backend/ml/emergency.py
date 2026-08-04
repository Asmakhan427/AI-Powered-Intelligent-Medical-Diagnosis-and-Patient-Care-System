"""
Shared red-flag / emergency detection.

Used by both predict.py (the classic pipeline) and the RAG pipeline's
emergency layer -- one module, so the two pipelines can't silently disagree
on what counts as an emergency.

Design: disease-specific categories (heart attack, stroke, respiratory,
other), each scored independently as a weighted SUM of its own symptom
concepts against its own configurable threshold. A category "fires" only
when its total crosses that threshold -- never from a single low-weight
symptom alone (e.g. "chest pain" by itself scores 2, under the heart-attack
threshold of 4; it needs a companion sign too). The same symptom can appear
in more than one category with a different weight, because its clinical
significance genuinely differs by context -- generic "shortness of breath"
is a moderate heart-attack companion (weight 2 -- common in plenty of
non-cardiac illness too, which is why it's dampened back down by
respiratory_infection_signs specifically when fever/cough explain it) but
the SEVERE form is a strong standalone respiratory-emergency signal on its
own (weight 5).

Disease presentations this file is specifically calibrated against so a
weighted model doesn't quietly regress into a keyword trigger:
  - "fever + cough + chest pain + difficulty breathing" is a textbook
    Pneumonia presentation, not a cardiac event -- must NOT fire.
  - "chest pain + left arm pain (+ sweating)" is a textbook heart-attack
    presentation -- must fire.
  - "chest pain + sweating (+ nausea)", with no "cold"/temperature
    qualifier on the sweating, is diaphoresis -- a classic, unqualified ACS
    companion sign in its own right -- must fire.
  - "chest pain + shortness of breath" with no fever/cough present (nothing
    else explaining the breathlessness) is treated as an unexplained,
    ACS-consistent combination -- must fire. The same combination WITH
    fever/cough present is the Pneumonia case above and must NOT fire.
"""
from phrase_matching import compile_phrase_alternation

# Phrase variants per concept, defined once and shared across categories
# below (so two categories weighting the same symptom differently don't
# each need their own copy of its phrase list).
CONCEPT_PHRASES: dict[str, list[str]] = {
    "chest_pain": ["chest pain", "pain in chest", "pain in my chest", "chest hurts"],
    "left_arm_pain": [
        "left arm pain",
        "pain in my left arm",
        "pain down my left arm",
        "pain spreads to my left arm",
        "spreads to my left arm",
        "radiating to my left arm",
    ],
    "jaw_pain": ["jaw pain", "pain in my jaw", "pain spreads to my jaw", "radiating to my jaw"],
    # Bare "sweating"/"sweaty" is deliberately included, not just the
    # "cold"-qualified phrasing -- diaphoresis (sweating without any
    # temperature qualifier) is itself a classic acute-coronary-syndrome
    # companion sign, and users describing real chest pain overwhelmingly
    # just say "sweating", not "cold sweat" (verified missing case:
    # "heavy chest pain with nausea and sweating" scored 3/4 under the old
    # phrase list -- chest_pain(2)+nausea(1) with sweating unmatched --
    # letting the classifier run unopposed and misclassify as Drug
    # Reaction instead of triggering the emergency override). Still can't
    # fire alone: it needs a companion sign to clear the threshold, same as
    # every other concept here.
    "cold_sweat": [
        "cold sweat",
        "cold sweats",
        "sweating and cold",
        "clammy skin",
        "sweating",
        "sweaty",
    ],
    "nausea": ["nausea", "nauseous", "feel sick", "feeling sick", "queasy"],
    # Generic/mild breathing difficulty -- weak signal, weighted low
    # wherever it's used; the SEVERE form below is weighted separately.
    "shortness_of_breath": [
        "shortness of breath",
        "short of breath",
        "out of breath",
        "difficulty breathing",
        "breathing difficulty",
        "trouble breathing",
        "hard to breathe",
    ],
    "severe_shortness_of_breath": [
        "severe shortness of breath",
        "severe difficulty breathing",
        "severe breathing difficulty",
        "can't catch my breath",
        "cant catch my breath",
        "extremely hard to breathe",
        "struggling to breathe",
    ],
    "unable_to_breathe": [
        "can't breathe",
        "cant breathe",
        "cannot breathe",
        "not breathing",
        "gasping for air",
        "unable to breathe",
    ],
    "wheezing": ["wheezing"],
    "blue_lips": ["blue lips"],
    "facial_drooping": ["facial drooping", "face is drooping", "face drooping", "one side of my face"],
    "slurred_speech": ["slurred speech", "trouble speaking", "can't speak clearly"],
    "weakness_one_side": [
        "weakness on one side",
        "weakness in my left side",
        "weakness in my right side",
        "one side of my body is weak",
    ],
    "sudden_confusion": ["sudden confusion", "confused and disoriented", "disoriented"],
    "sudden_vision_loss": ["sudden vision loss", "sudden loss of vision", "suddenly can't see"],
    "coughing_blood": [
        "coughing blood",
        "cough up blood",
        "coughing up blood",
        "cough with blood",
        "coughing with blood",
        "blood in my cough",
        "blood when i cough",
    ],
    "seizure": ["seizure", "convulsion", "convulsing"],
    "loss_of_consciousness": [
        "loss of consciousness",
        "unconsciousness",
        "passed out",
        "fainted",
        "unconscious",
        "unresponsive",
    ],
    "anaphylaxis": ["anaphylaxis"],
    "severe_allergic_reaction": ["severe allergic reaction", "throat closing", "throat is closing"],
    "severe_bleeding": ["severe bleeding", "heavy bleeding", "bleeding heavily", "won't stop bleeding"],
    "suicidal": ["suicidal", "want to die", "want to end it", "kill myself"],
    "heart_attack_named": ["heart attack"],
    "stroke_named": ["stroke"],
    # Used only as a heart_attack dampener (negative weight, see below) --
    # NOT a general-purpose fever/cough concept, and not referenced by any
    # other category. Its only job is telling apart two presentations that
    # otherwise look identical to a pure chest-pain+breathlessness score:
    # unexplained breathlessness (a genuine ACS red flag) vs. breathlessness
    # already explained by a respiratory infection (the textbook Pneumonia
    # case this file's docstring names as a must-NOT-fire example).
    "respiratory_infection_signs": ["fever", "high fever", "feverish", "cough", "coughing"],
}

_COMPILED = {name: compile_phrase_alternation(phrases) for name, phrases in CONCEPT_PHRASES.items()}


def _present(symptoms_lower: str, concept: str) -> bool:
    return bool(_COMPILED[concept].search(symptoms_lower))


# category -> {"threshold": int, "weights": {concept: weight}}. A category
# fires when the sum of its matched concepts' weights reaches its
# threshold. Configurable in one place, per category, by design.
EMERGENCY_CATEGORIES: dict[str, dict] = {
    "heart_attack": {
        "threshold": 4,
        "weights": {
            "chest_pain": 2,
            "left_arm_pain": 3,
            "jaw_pain": 3,
            "cold_sweat": 2,
            # Raised from 1 to 2 so chest_pain + shortness_of_breath alone
            # (2+2=4) clears the threshold, as a classic ACS presentation
            # should. This alone would also re-fire on the Pneumonia case
            # (fever+cough+chest pain+difficulty breathing) that this
            # weight was originally kept low to avoid -- respiratory_
            # infection_signs' -1 below exists specifically to cancel that
            # back out only when fever/cough explain the breathlessness.
            "shortness_of_breath": 2,
            "nausea": 1,
            "loss_of_consciousness": 5,
            "heart_attack_named": 5,
            # See CONCEPT_PHRASES's comment on this concept: suppresses the
            # shortness_of_breath bump above specifically for the
            # infection-explained case, without touching the genuine
            # ACS case (no fever/cough mentioned).
            "respiratory_infection_signs": -1,
        },
    },
    "stroke": {
        # Each of these is independently a recognized stroke red flag
        # (matches real FAST-style stroke assessment) -- no combo required,
        # so each is weighted to clear the threshold alone.
        "threshold": 5,
        "weights": {
            "facial_drooping": 5,
            "slurred_speech": 5,
            "weakness_one_side": 5,
            "sudden_confusion": 5,
            "sudden_vision_loss": 5,
            "stroke_named": 5,
        },
    },
    "respiratory": {
        "threshold": 5,
        "weights": {
            "unable_to_breathe": 5,
            "severe_shortness_of_breath": 5,
            "blue_lips": 5,
            # "wheezing with severe breathing difficulty" -- explicitly a
            # combo; wheezing alone (e.g. asthma triggered by exercise or
            # cold air) must not fire on its own.
            "wheezing": 2,
        },
    },
    "other": {
        "threshold": 5,
        "weights": {
            "coughing_blood": 5,
            "seizure": 5,
            "loss_of_consciousness": 5,
            "severe_bleeding": 5,
            "suicidal": 5,
            # Naming the condition directly is unambiguous alone; the
            # vaguer phrase needs the breathing-difficulty combo it's
            # actually described with ("severe allergic reaction WITH
            # breathing difficulty").
            "anaphylaxis": 5,
            "severe_allergic_reaction": 3,
            "shortness_of_breath": 2,
        },
    },
}


def category_scores(symptoms_lower: str) -> dict[str, int]:
    """symptoms_lower must already be lowercased (see check_emergency).
    Exposed for debugging/logging -- classification itself only needs
    check_emergency()."""
    return {
        category: sum(weight for concept, weight in spec["weights"].items() if _present(symptoms_lower, concept))
        for category, spec in EMERGENCY_CATEGORIES.items()
    }


def check_emergency(symptoms_lower: str) -> bool:
    """symptoms_lower must already be lowercased -- callers already do this
    once for other checks (severity scoring, etc.), so it isn't repeated
    here to avoid lowering the same string twice per request."""
    return any(
        score >= EMERGENCY_CATEGORIES[category]["threshold"]
        for category, score in category_scores(symptoms_lower).items()
    )
