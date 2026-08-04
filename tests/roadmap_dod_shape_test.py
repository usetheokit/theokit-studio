#!/usr/bin/env python3
"""Forma dos bullets de Definition of done no ROADMAP (plano M7, T1.2).

O oráculo é ESTRUTURAL, não linguístico. O detector "o critério termina em '.' ou ')'" foi
REJEITADO no /edge-case-plan (EC-2): o bullet real de M2 quebra logo depois de
"(model/provider/tokens)" e passaria como completo estando truncado — ou seja, o oráculo falharia
exatamente no caso que motivou a task.

Truncamento é continuação de linha física. É isso que se detecta aqui, mais a paridade entre o
que o extrator de `cycle-acceptance` enxerga e o que existe no arquivo.

Os milestones são DESCOBERTOS do arquivo, nunca listados à mão (review F-tests-1): a primeira
versão fixava M1/M2/M3 e reportava PASS enquanto M0 — ainda `[ ]` e alvo futuro de
`/acceptance` — carregava o mesmo defeito de truncamento que o teste existe para pegar.

Roda de dois jeitos, ambos suportados:
    python3 tests/roadmap_dod_shape_test.py          # direto, exit 0/1
    python3 -m pytest tests/                         # coletado como suíte
"""

from __future__ import annotations

import argparse
import importlib.util
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ROADMAP = REPO_ROOT / "ROADMAP.md"

DOD_MARKER = "**Definition of done:**"
END_MARKERS = ("**Dependencies:**", "**Top risks")
MILESTONE_HEADER_RE = re.compile(r"^###\s+(M\d+)\s+—", re.MULTILINE)


def _load_extractor():
    """Importa o extrator real do cycle-acceptance — ele é o oráculo, não uma reimplementação."""
    path = REPO_ROOT / ".claude/skills/acceptance/scripts/extract_acceptance_criteria.py"
    if not path.exists():
        raise FileNotFoundError(f"extrator de critérios não encontrado em {path}")
    spec = importlib.util.spec_from_file_location("extract_acceptance_criteria", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"não foi possível carregar {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def discover_milestones(roadmap_text: str) -> list[str]:
    """Todo `### M<N> —` que declara um bloco de Definition of done.

    Descoberta, não lista fixa: um milestone novo entra no escopo do teste sozinho.
    """
    found = []
    for match in MILESTONE_HEADER_RE.finditer(roadmap_text):
        milestone = match.group(1)
        try:
            if dod_block_lines(roadmap_text, milestone):
                found.append(milestone)
        except ValueError:
            continue
    return found


def dod_block_lines(roadmap_text: str, milestone_id: str) -> list[str]:
    """Linhas entre `**Definition of done:**` e o próximo marcador de fim, do milestone dado."""
    header_re = re.compile(rf"^###\s+{re.escape(milestone_id)}\s+—", re.MULTILINE)
    lines = roadmap_text.split("\n")
    start = next((i for i, line in enumerate(lines) if header_re.match(line)), None)
    if start is None:
        raise ValueError(f"milestone {milestone_id} não encontrado no ROADMAP")
    dod = None
    for i in range(start + 1, len(lines)):
        if lines[i].startswith("### "):
            break
        if lines[i].strip() == DOD_MARKER:
            dod = i
            break
    if dod is None:
        return []
    block: list[str] = []
    for line in lines[dod + 1 :]:
        if any(line.startswith(marker) for marker in END_MARKERS) or line.startswith("### "):
            break
        block.append(line)
    return block


def continuation_lines(roadmap_text: str, milestone_id: str) -> list[str]:
    """Linhas do bloco de DoD que NÃO abrem um bullet — ou seja, bullets truncados."""
    return [
        line
        for line in dod_block_lines(roadmap_text, milestone_id)
        if line.strip() and not line.lstrip().startswith("- [")
    ]


def _roadmap_text() -> str:
    return DEFAULT_ROADMAP.read_text(encoding="utf-8")


# --- Suíte (coletável por pytest E executável direto) ---------------------------------------


def test_nenhum_bullet_de_dod_ocupa_mais_de_uma_linha() -> None:
    text = _roadmap_text()
    offenders = {
        milestone: continuation_lines(text, milestone)
        for milestone in discover_milestones(text)
    }
    broken = {m: lines for m, lines in offenders.items() if lines}
    assert not broken, f"bullets de DoD quebrados em várias linhas: {broken}"


def test_extrator_ve_o_mesmo_numero_de_criterios_que_o_arquivo() -> None:
    text = _roadmap_text()
    extractor = _load_extractor()
    mismatches = {}
    for milestone in discover_milestones(text):
        extracted = extractor.extract(text, milestone).get("criteria", [])
        bullets = [
            line for line in dod_block_lines(text, milestone) if line.lstrip().startswith("- [")
        ]
        if len(extracted) != len(bullets) or len(bullets) < 1:
            mismatches[milestone] = (len(extracted), len(bullets))
    assert not mismatches, f"extrator vê contagem diferente do arquivo (extraído, arquivo): {mismatches}"


def main() -> int:
    global DEFAULT_ROADMAP  # noqa: PLW0603 — permite apontar o script a outro arquivo na CLI

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--roadmap", type=Path, default=DEFAULT_ROADMAP)
    args = parser.parse_args()
    DEFAULT_ROADMAP = args.roadmap

    failures = []
    for check in (
        test_nenhum_bullet_de_dod_ocupa_mais_de_uma_linha,
        test_extrator_ve_o_mesmo_numero_de_criterios_que_o_arquivo,
    ):
        try:
            check()
        except AssertionError as error:
            failures.append(f"{check.__name__}: {error}")

    if failures:
        for failure in failures:
            print(f"FAIL {failure}", file=sys.stderr)
        return 1
    milestones = discover_milestones(_roadmap_text())
    print(f"PASS forma do DoD verificada em {', '.join(milestones)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
