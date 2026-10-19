#!/usr/bin/env python3
"""Workflow word count for an academic draft.

This is an internal consistency counter. It is not Word, Google Docs, or
the marker's count. Report it as 工作流词数.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


# Parentheses that contain a 19xx/20xx year, including
# (Minsky, 1986), (Minsky 1986), (see Minsky, 1986),
# (Kalecki, 1933; Kaldor, 1957), (Lavoie, 2014, pp. 35-40),
# (McLeay et al., 2014), (Bank of England, 2014).
CITE_PAREN = re.compile(
    r"\(\s*(?:see(?:\s+also)?|cf\.?|e\.g\.?,?|i\.e\.?,?)?\s*"
    r"[^()]{0,300}?(?:19|20)\d{2}[a-z]?(?:[^()]{0,300})?\)",
    re.IGNORECASE,
)


def tokenize(text: str) -> list[str]:
    text = text.replace("\u2014", " ").replace("\u2013", " ").replace("\u2011", "-")
    return re.findall(r"[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*", text)


def strip_cite_parens(text: str) -> str:
    return CITE_PAREN.sub(" ", text)


def count_text(text: str) -> dict[str, int]:
    full = tokenize(text)
    nocite = tokenize(strip_cite_parens(text))
    return {
        "words": len(full),
        "words_without_cite_parens": len(nocite),
        "cite_paren_words": len(full) - len(nocite),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Workflow word count. Not a platform or marker count."
    )
    parser.add_argument("path", nargs="?", help="Text file. Read stdin if omitted.")
    parser.add_argument("--limit", type=int, help="Optional positive maximum; no default cap.")
    parser.add_argument(
        "--basis",
        choices=("without_cite", "full"),
        help="Required with --limit. without_cite is a year-parentheses heuristic.",
    )
    args = parser.parse_args()

    if args.limit is not None and args.limit <= 0:
        parser.error("--limit must be positive")
    if args.limit is not None and args.basis is None:
        parser.error("--limit requires an explicit --basis full or without_cite")
    try:
        if args.path:
            raw = Path(args.path).read_text(encoding="utf-8-sig")
        else:
            raw = sys.stdin.read()
    except (OSError, UnicodeError) as exc:
        parser.error(f"cannot read UTF-8 input: {exc}")

    stats = count_text(raw)
    basis_key = (
        "words_without_cite_parens" if args.basis == "without_cite" else "words"
    )
    used = stats[basis_key]
    print("label\tworkflow_word_count")
    print(f"limit\t{args.limit if args.limit is not None else 'not_set'}")
    print(f"limit_basis\t{args.basis or 'not_set'}")
    print(f"words\t{stats['words']}")
    print(f"words_without_cite_parens\t{stats['words_without_cite_parens']}")
    print(f"cite_paren_words\t{stats['cite_paren_words']}")
    print(f"over_limit\t{max(0, used - args.limit) if args.limit is not None else 'not_evaluated'}")
    print(f"remaining_to_max\t{max(0, args.limit - used) if args.limit is not None else 'not_evaluated'}")
    print(f"year_parentheses_groups\t{len(CITE_PAREN.findall(raw))}")
    print("heuristic_note\twithout_cite removes parenthetical groups containing 19xx/20xx years, including non-citations; review them manually")
    print("note\tNot Word/Docs/marker count")


if __name__ == "__main__":
    main()
