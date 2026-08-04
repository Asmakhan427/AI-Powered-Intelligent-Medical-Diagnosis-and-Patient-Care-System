"""
Symptom-text normalization, shared between train_model.py (applied to every
training row before fitting the vectorizer) and predict.py (applied to the
user's query before inference).

TF-IDF matches exact tokens: "burns" and "burning" are unrelated tokens to
it, and "eating"/"meals" are unrelated words with no way for it to know
they're describing the same thing. A query like "my chest burns after
eating" can end up sharing almost no vocabulary with a training example
phrased "burning chest pain after meals", even though a person would
recognize them as the same complaint. Normalizing both sides to the same
canonical phrasing before vectorization is the classical-NLP fix for this
that doesn't require abandoning TF-IDF for embeddings.

Deliberately separate from predict.py's SEVERITY_SYNONYMS: that dictionary
normalizes a different, narrower vocabulary (the exact concepts in
Symptom-severity.csv) for a different purpose (scoring severity on the RAW
symptom text). This one normalizes the text that actually gets fed to the
disease classifier, and must never be applied to the severity/emergency
input -- doing so would make severity scoring silently match different text
than the user actually typed.
"""
from phrase_matching import compile_phrase_alternation

# canonical phrase -> phrasings that should be treated as the same symptom.
# Each variant is matched whole-word/whole-phrase, never as a substring of
# an unrelated word, and replaced with its canonical form before the text
# reaches the vectorizer -- at both training and inference time, or the two
# sides would drift apart and reintroduce the exact mismatch this exists to
# fix.
SYMPTOM_SYNONYMS: dict[str, list[str]] = {
    "burning": ["burns", "burnt", "burned"],
    "meals": ["eating", "after i eat", "after i ate", "after food", "post meal"],
    "vomiting": ["throwing up", "vomited", "vomits"],
    "diarrhoea": ["diarrhea", "loose motions", "loose stools"],
    "dizziness": ["dizzy", "lightheaded", "light headed"],
    "fatigue": ["tired", "exhausted", "worn out"],
    "nausea": ["nauseous", "queasy", "feel sick", "feeling sick"],
    "chills": ["shivering", "shivers"],
    "thirst": ["thirsty"],
    "throat irritation": ["sore throat", "scratchy throat"],
    "headache": ["headaches"],
    # NOT normalizing urinating -> urination: tried it, and it actively
    # hurt Diabetes -- dataset.csv's "spotting_ urination" is exclusively a
    # Drug Reaction symptom (120 structured rows), while Diabetes only gets
    # "urination" from a couple of free-text mentions, so normalizing onto
    # it pulled the query toward Drug Reaction instead. Same pathology as
    # the itching/itchy case above.
    # NOT normalizing itchy/itches -> itching: tried it, and it actively
    # hurt one case (a Drug Reaction description using "itchy" lost its
    # more specific match and shifted to a confident-wrong Chicken pox
    # guess) -- "itching" turns out to be such a widely-shared token across
    # skin-disease training rows that normalizing onto it traded a
    # specific signal for a diffuse one. Not every true synonym pair is
    # safe to merge; this one wasn't, so it's left alone.
    # NOT normalizing stomach pain/abdominal pain -> belly pain: tried it,
    # and it did not fix the Typhoid case it targeted (still misclassified,
    # just shifted from GERD to Uncertain) while diluting Peptic ulcer
    # diseae's signal for an unrelated case. Same pathology as itching and
    # urination above: "belly pain" is Typhoid's exclusive term, but
    # merging the much more common "stomach pain"/"abdominal pain" onto it
    # pulls the combined vocabulary toward the diseases that already
    # dominate it (GERD, Drug Reaction, Peptic ulcer diseae) instead of the
    # other way around.
}

_COMPILED = [(compile_phrase_alternation(variants), canonical) for canonical, variants in SYMPTOM_SYNONYMS.items()]


def normalize_symptom_text(text: str) -> str:
    """Lowercases and replaces every known variant with its canonical form.
    Must be applied identically to training text and the user's query --
    normalizing only one side reintroduces the vocabulary mismatch this
    exists to fix."""
    normalized = text.lower()
    for pattern, canonical in _COMPILED:
        normalized = pattern.sub(canonical, normalized)
    return normalized
