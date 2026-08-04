#!/usr/bin/env python3
"""Forma dos bullets de Definition of done no ROADMAP (plano M7, T1.2).

O oráculo é ESTRUTURAL, não linguístico. O detector "o critério termina em '.' ou ')'" foi
REJEITADO no /edge-case-plan (EC-2): o bullet real de M2 quebra logo depois de
"(model/provider/tokens)" e passaria como completo estando truncado — ou seja, o oráculo falharia
exatamente no caso que motivou a task.

Truncamento é continuação de linha física. É isso que se detecta aqui, mais a paridade entre o
que o extrator de `cycle-acceptance` enxerga e o que existe no arquivo.

Uso: python3 tests/roadmap_dod_shape_test.py [--roadmap ROADMAP.md]
Exit 0 = todos os milestones verificados passam.
"""

from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path

MILESTONES = ("M1", "M2", "M3")
DOD_MARKER = "**Definition of done:**"
END_MARKERS = ("**Dependencies:**", "**Top risks")


def _load_extractor(repo_root: Path):
    """Importa o extrator real do cycle-acceptance — ele é o oráculo, não uma reimplementação."""
    path = repo_root / ".claude/skills/acceptance/scripts/extract_acceptance_criteria.py"
    if not path.exists():
        raise FileNotFoundError(f"extrator de critérios não encontrado em {path}")
    spec = importlib.util.spec_from_file_location("extract_acceptance_criteria", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"não foi possível carregar {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def dod_block_lines(roadmap_text: str, milestone_id: str) -> list[str]:
    """Linhas entre `**Definition of done:**` e o próximo marcador de fim, do milestone dado."""
    header_prefix = f"### {milestone_id} "
    lines = roadmap_text.split("\n")
    start = next(
        (i for i, line in enumerate(lines) if line.startswith(header_prefix)),
        None,
    )
    if start is None:
        raise ValueError(f"milestone {milestone_id} não encontrado no ROADMAP")
    dod = next(
        (i for i in range(start, len(lines)) if lines[i].strip() == DOD_MARKER),
        None,
    )
    if dod is None:
        raise ValueError(f"{milestone_id} não declara {DOD_MARKER}")
    block: list[str] = []
    for line in lines[dod + 1 :]:
        if any(line.startswith(marker) for marker in END_MARKERS) or line.startswith("### "):
            break
        block.append(line)
    return block


def test_nenhum_bullet_de_dod_ocupa_mais_de_uma_linha(roadmap_text: str) -> list[str]:
    failures = []
    for milestone in MILESTONES:
        lines = dod_block_lines(roadmap_text, milestone)
        continuations = [
            line for line in lines if line.strip() and not line.lstrip().startswith("- [")
        ]
        if continuations:
            failures.append(f"{milestone}: bullet quebrado em {continuations!r}")
    return failures


def test_extrator_ve_o_mesmo_numero_de_criterios_que_o_arquivo(
    roadmap_text: str, extractor
) -> list[str]:
    failures = []
    for milestone in MILESTONES:
        extracted = extractor.extract(roadmap_text, milestone).get("criteria", [])
        bullets = [
            line
            for line in dod_block_lines(roadmap_text, milestone)
            if line.lstrip().startswith("- [")
        ]
        if len(bullets) < 1:
            failures.append(f"{milestone}: nenhum bullet de DoD")
        elif len(extracted) != len(bullets):
            failures.append(
                f"{milestone}: extrator vê {len(extracted)} critérios, arquivo tem {len(bullets)}"
            )
    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--roadmap", type=Path, default=Path("ROADMAP.md"))
    args = parser.parse_args()

    repo_root = args.roadmap.resolve().parent
    roadmap_text = args.roadmap.read_text(encoding="utf-8")
    extractor = _load_extractor(repo_root)

    failures = test_nenhum_bullet_de_dod_ocupa_mais_de_uma_linha(roadmap_text)
    failures += test_extrator_ve_o_mesmo_numero_de_criterios_que_o_arquivo(roadmap_text, extractor)

    if failures:
        for failure in failures:
            print(f"FAIL {failure}", file=sys.stderr)
        return 1
    print(f"PASS forma do DoD verificada em {', '.join(MILESTONES)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
