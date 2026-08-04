"""
Regression test runner for the symptom-to-disease model.

Unlike train_model.py's k-fold CV (which measures accuracy on templated
dataset text), this runs predict.py through its real CLI interface against
hand-written, non-templated inputs -- closer to what an actual user would
type, including a couple of intentionally short/ambiguous ones. This is the
number that should be checked after any data or model change, not just the
CV score.

Run from anywhere:
    python ml/tests/run_cases.py
"""

import json
import subprocess
import sys
from pathlib import Path

ML_DIR = Path(__file__).parent.parent
PREDICT_SCRIPT = ML_DIR / "predict.py"
CASES_FILE = Path(__file__).parent / "cases.json"


def run_predict(text: str) -> dict:
    result = subprocess.run(
        [sys.executable, str(PREDICT_SCRIPT), text],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"predict.py exited {result.returncode}: {result.stderr}")
    return json.loads(result.stdout)


def main():
    cases = json.loads(CASES_FILE.read_text())
    passed = 0
    failed = 0

    for case in cases:
        text = case["text"]
        output = run_predict(text)

        if "expect" in case:
            ok = output["disease"] == case["expect"]
            label = f'expected "{case["expect"]}"'
        elif case.get("expect_emergency"):
            ok = output["emergency"] is True
            label = "expected emergency=true"
        elif case.get("expect_uncertain"):
            ok = output["disease"].startswith("Uncertain")
            label = "expected low-confidence abstention"
        elif "expect_not_emergency" in case:
            ok = output["emergency"] is False
            label = "expected emergency=false"
        else:
            raise ValueError(f"Case has no expectation: {case}")

        status = "PASS" if ok else "FAIL"
        if ok:
            passed += 1
        else:
            failed += 1
        print(
            f'[{status}] "{text[:60]}{"..." if len(text) > 60 else ""}" '
            f'-> disease={output["disease"]!r} confidence={output["confidence"]} '
            f'emergency={output["emergency"]} ({label})'
        )

    print(f"\n{passed}/{passed + failed} passed")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
