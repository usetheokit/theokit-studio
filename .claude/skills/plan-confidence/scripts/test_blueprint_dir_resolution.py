"""Regression test: blueprint refs must resolve in the plugin-install layout.

Bug (2026-07-14): `_scan_blueprint_refs` only looked at
`{root}/knowledge-base/discoveries/blueprints/`, ignoring the plugin-install layout
`{root}/.claude/knowledge-base/discoveries/blueprints/` that `_resolve_rule_file`
already handles — every `Blueprint §"X"` citation was reported fabricated even when
the blueprint existed. Run: python3 test_blueprint_dir_resolution.py
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_evidence_citations import _scan_blueprint_refs


def _mk_root_with_blueprint(layout: str) -> Path:
    root = Path(tempfile.mkdtemp())
    bp_dir = root / layout / "knowledge-base" / "discoveries" / "blueprints"
    bp_dir.mkdir(parents=True)
    (bp_dir / "demo-blueprint.md").write_text(
        "# Blueprint: demo\n\n### T1 — shell\n\nconteudo\n", encoding="utf-8"
    )
    return root


def _line_index(prose: str) -> list[int]:
    idx, line = [], 1
    for ch in prose:
        idx.append(line)
        if ch == "\n":
            line += 1
    return idx or [1]


def test_resolves_blueprint_in_dot_claude_layout():
    root = _mk_root_with_blueprint(".claude")
    prose = 'padrão validado no Blueprint §"T1" da referência'
    results = _scan_blueprint_refs(prose, _line_index(prose), root)
    assert results, "expected one blueprint citation scanned"
    citation, ok = results[0]
    assert ok, f"citation should resolve in .claude layout, got reason: {citation.reason}"


def test_resolves_blueprint_in_plain_layout():
    root = _mk_root_with_blueprint(".")
    prose = 'padrão validado no Blueprint §"T1" da referência'
    results = _scan_blueprint_refs(prose, _line_index(prose), root)
    citation, ok = results[0]
    assert ok, f"citation should resolve in plain layout, got reason: {citation.reason}"


def test_missing_section_still_flagged():
    root = _mk_root_with_blueprint(".claude")
    prose = 'ver Blueprint §"NAO-EXISTE"'
    results = _scan_blueprint_refs(prose, _line_index(prose), root)
    citation, ok = results[0]
    assert not ok, "nonexistent section must remain flagged"


if __name__ == "__main__":
    test_resolves_blueprint_in_dot_claude_layout()
    test_resolves_blueprint_in_plain_layout()
    test_missing_section_still_flagged()
    print("OK — blueprint dir resolution regression tests passed")
