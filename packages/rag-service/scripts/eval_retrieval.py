"""
Retrieval-quality benchmark: for each disease-labeled case in
ml/tests/cases.json, does the expected disease appear in the top-1/3/5
retrieved candidates? Reuses that same file rather than maintaining a
second set of eval cases -- it's already hand-written, non-templated, and
exactly the input shape this pipeline receives (see ml/tests/run_cases.py's
docstring).

Run after scripts/build_knowledge_base.py:
    python scripts/eval_retrieval.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.retrieval import retrieve  # noqa: E402

CASES_FILE = Path(__file__).parent.parent.parent / "backend" / "ml" / "tests" / "cases.json"


def main():
    cases = [c for c in json.loads(CASES_FILE.read_text()) if "expect" in c]
    hits_top1 = hits_top3 = hits_top5 = 0

    for case in cases:
        candidates = retrieve(case["text"], top_k=5)
        names = [c.disease for c in candidates]
        top1 = names[0] == case["expect"] if names else False
        top3 = case["expect"] in names[:3]
        top5 = case["expect"] in names
        hits_top1 += top1
        hits_top3 += top3
        hits_top5 += top5
        status = "PASS" if top5 else "FAIL"
        print(
            f'[{status}] "{case["text"][:55]}" expected={case["expect"]!r} '
            f"retrieved={names}"
        )

    total = len(cases)
    print(f"\ntop-1: {hits_top1}/{total} ({hits_top1/total:.0%})")
    print(f"top-3: {hits_top3}/{total} ({hits_top3/total:.0%})")
    print(f"top-5: {hits_top5}/{total} ({hits_top5/total:.0%})")


if __name__ == "__main__":
    main()
