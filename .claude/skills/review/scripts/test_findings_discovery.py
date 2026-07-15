"""Regression test: consolidate must discover BOTH .yml and .yaml findings files.

Bug (2026-07-14): main() usava glob("*.yml") apenas — todos os agentes escrevem
`{role}.yaml`, então 100% dos findings eram DROPADOS silenciosamente e o report saía
READY_TO_MERGE com 0 findings (a classe de meta-defeito que o estágio judge-codex:final
existe para pegar). Run: python3 test_findings_discovery.py
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from consolidate_findings import _discover_findings_files


def test_discovers_yaml_and_yml():
    d = Path(tempfile.mkdtemp())
    (d / "architecture.yaml").write_text("agent: architecture\nfindings: []\n")
    (d / "legacy.yml").write_text("agent: legacy\nfindings: []\n")
    (d / "notes.txt").write_text("ignore me")
    found = sorted(p.name for p in _discover_findings_files(d))
    assert found == ["architecture.yaml", "legacy.yml"], f"got: {found}"


if __name__ == "__main__":
    test_discovers_yaml_and_yml()
    print("OK — findings discovery regression test passed")
