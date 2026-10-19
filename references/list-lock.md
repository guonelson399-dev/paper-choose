# List-lock

This file describes the manual/model apply-phase gate within current author authorization. It takes precedence over optional fluency or consistency edits. The local executor enforces exact author-selected P1/P2 replacements for supported UTF-8 plain text. It does not verify the semantic correctness of the proposed replacement or govern edits made outside the executor. C/D/E remain manual.

## What may change

Only the span named in a selected row.

| Selected list | Allowed change | Forbidden |
|---|---|---|
| P1 | Replace that row's 英文原句 with that row's 最小改法 | Edit any other sentence; add clauses; retitle the section |
| P2 | Replace that row's 原文片段 with that row's 建议替换 | Expand the fragment into a rewrite of the whole sentence unless the row already gave a whole sentence |
| C | Delete that row's 原句 in place | Merge the leftover paragraph; move a surviving clause to another section; delete an unlisted adjacent sentence |
| D | Replace that row's 原句 with that row's 精简稿 | Further shorten, restyle, or split the sentence |
| E | Insert that row's sentence at that row's 插入位置 | Insert extra context; invent numbers or sources |

`apply none` changes zero characters.

**最终稿门禁：** 未经用户选择的修改不得进入最终稿. If a change has no selected ID, revert it before the text is called 最终稿. D rows are not final unless the author selected those D IDs.

AEC and BTI never write into the final draft. They only list differences.

## Author ID overrides advice

- `C-all` / `P1-all` / `P2-all` / `D-all` means every ID in that list in the last audit, including C rows marked 可留.
- A single ID means only that row.
- Unselected rows stay verbatim, even if they contain an obvious typo noticed later.

## No silent companion edits

Do not, without a selected row, change

- commas, hyphens, capitals, or article use in a neighboring word
- school-label spelling in a sentence that was not in the selected row
- citation punctuation outside the selected fragment
- heading text or heading level
- paragraph breaks except the blank left by a C deletion
- “the / a / an” to make a listed patch read better

If the 最小改法 or 精简稿 will not parse unless an unlisted word also changes, do not patch. Report the clash and ask for a new ID.

## Apply order

1. P1 selected rows, in ID order.
2. P2 selected rows, in ID order. If an earlier patch changed its source span, do not guess a new location. If the selected exact replacement is already fully contained, report already-contained; otherwise block the conflict and request an updated row.
3. C selected rows.
4. D selected rows. Apply only when the stored source span still matches uniquely. If P/C changed it, report a stale/conflicting row and request author selection of an updated row.
5. E selected rows.

Do not invent a new D wording during apply. Bind each selected row to the audited input version, exact span and unique context. A stale input, repeated ambiguous span, or overlapping conflicting rows must be reported, not silently reinterpreted.

## Verification before showing the revised text

Check every diff hunk against selected IDs.

- Every changed span must map to one selected ID.
- Every selected ID must be either applied or reported as blocked (clash / already-contained).
- If a hunk has no ID, revert that hunk before output.

## Output after apply

Executed IDs, unexecuted IDs, revised text, new workflow count, delta, remaining cap issue. No extra polish paragraph. No new rewrite of unselected sentences.
