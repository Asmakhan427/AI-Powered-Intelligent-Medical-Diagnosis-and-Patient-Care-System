"""
Shared phrase-matching primitive used by emergency.py, text_normalize.py,
and predict.py's severity-synonym matching. Each owns its own
canonical-concept -> phrase-variants data for a different purpose
(emergency red flags, TF-IDF vocabulary normalization, Symptom-severity.csv
concept scoring), but turning a list of phrase variants into a safe,
whole-word/whole-phrase regex was previously written three separate times
with the same three lines. One implementation here instead.
"""
import re


def compile_phrase_alternation(phrases: list[str]) -> re.Pattern:
    """Compiles phrase variants into one alternation pattern, matched with
    word boundaries so multi-word phrases are matched as complete phrases
    and a single word never matches inside an unrelated longer word."""
    return re.compile(r"\b(?:" + "|".join(re.escape(p) for p in phrases) + r")\b")
