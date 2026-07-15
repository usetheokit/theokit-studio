"""Regression test: file-size budget must skip GENERATED artifacts (lockfiles).

Bug (2026-07-14): pnpm-lock.yaml (4799 linhas, gerado pelo pnpm) disparava
`file_size_exceeded` HIGH — o budget de LoC do plano/architecture.md aplica-se a
módulos-FONTE, não a artefatos gerados por ferramenta.
Run: python3 test_acceptance_generated_files.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from check_acceptance_criteria import _is_generated_artifact


def test_lockfiles_are_generated():
    for name in ("pnpm-lock.yaml", "package-lock.json", "yarn.lock", "Cargo.lock", "go.sum", "poetry.lock", "uv.lock"):
        assert _is_generated_artifact(name), f"{name} deveria ser artefato gerado"


def test_source_files_are_not_generated():
    for name in ("packages/studio/src/app.tsx", "src/main.py", "CHANGELOG.md", "biome.json"):
        assert not _is_generated_artifact(name), f"{name} NÃO é artefato gerado"


if __name__ == "__main__":
    test_lockfiles_are_generated()
    test_source_files_are_not_generated()
    print("OK — generated-artifact regression tests passed")
