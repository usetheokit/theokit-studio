"""Regression test: _parse_thresholds must honor the documented `KEY = VALUE` format.

Bug (2026-07-14): rules/discover-plan-thresholds.txt documents `KEY = VALUE`, but the
parser only split on `|`, yielding empty bands and an unconditional INVALID verdict even
at score 100. Run: python3 test_parse_thresholds.py
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from run_discover_plan_score import _parse_thresholds, _verdict_for


def _write(content: str) -> Path:
    f = tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8")
    f.write(content)
    f.close()
    return Path(f.name)


def test_equals_format_with_band_prefix_and_inline_comments():
    path = _write(
        """# comment
soft_cap.question_count_low = 3
hard_cap.fabricated_citation = 49
band.shippable = 90
band.shippable_with_caveats = 70   # inline comment
band.needs_revision = 50
band.invalid = 0
"""
    )
    bands = _parse_thresholds(path)
    assert bands == {
        "SHIPPABLE": 90,
        "SHIPPABLE_WITH_CAVEATS": 70,
        "NEEDS_REVISION": 50,
        "INVALID": 0,
    }, f"unexpected bands: {bands}"
    assert _verdict_for(100.0, bands) == "SHIPPABLE"
    assert _verdict_for(75.0, bands) == "SHIPPABLE_WITH_CAVEATS"
    assert _verdict_for(55.0, bands) == "NEEDS_REVISION"
    assert _verdict_for(10.0, bands) == "INVALID"


def test_legacy_pipe_format_still_parses():
    path = _write("SHIPPABLE | 90\nINVALID | 0\n")
    bands = _parse_thresholds(path)
    assert bands == {"SHIPPABLE": 90, "INVALID": 0}, f"unexpected bands: {bands}"


def test_empty_bands_fail_closed():
    path = _write("# only comments\n")
    bands = _parse_thresholds(path)
    assert bands == {}
    assert _verdict_for(100.0, bands) == "INVALID"


if __name__ == "__main__":
    test_equals_format_with_band_prefix_and_inline_comments()
    test_legacy_pipe_format_still_parses()
    test_empty_bands_fail_closed()
    print("OK — all _parse_thresholds regression tests passed")
