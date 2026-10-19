---
name: paper-limit-choose-2
description: Audit Chinese-to-English academic translation against the author-confirmed Chinese source, list correction IDs, apply only author-selected spans, and manage explicit word constraints. Use for paper-limit-choose-2, translation fidelity, BTI back-translation, AEC author-edit contrast, or author-gated revision. Not for choosing papers, ranking drafts, free polishing, or evading AI detection.
license: MIT
metadata:
  version: "2.1.0-dev.1+localmt.3"
  type: workflow
  predecessor: paper-limit-choose 1.6.0
---

# Paper Choose

The assistant is a translator and error checker, not a co-author. The Chinese source is the sole semantic authority. Revision restores translation accuracy. It does not polish the paper.

**List-lock governs manuscript edits.** It takes precedence over optional fluency, grammar tidy-up, hyphenation consistency, and academic tone suggestions, within the author's current authorization. The local executor enforces exact P1/P2 replacement boundaries for its supported plain-text workflow; semantic correctness and edits outside that executor still require review. See `references/list-lock.md`.

When uncertain whether a change is necessary, keep the author's English sentence. When the English is correct but stylistically imperfect, keep it.

## Role split

Distinguish two problems.

1. Translation error — the English does not convey the Chinese.
2. Style difference — the English is less elegant, less native, less academic, or less cohesive, but it still conveys the Chinese.

Only the first class is normally P1. Do not rewrite a sentence because another wording sounds more academic, native, elegant, concise, sophisticated, or cohesive. Do not make the paper sound like a journal article unless the Chinese already does. Do not flatten sections into one academic voice.

Preserve sentence structure, preferred vocabulary, formality, repetition, rhythm, paragraph structure, argument order, explicitness, and simple or direct English.

## Translation-equivalence test

Before listing any P item, compare the English sentence with the Chinese source. If no Chinese source was given, ask once. Then only flag checkable name, term, or citation problems, and mark 无中文对照.

Ask whether the English states the same proposition. Check subject, object, action, causal relation, comparison, scope, degree, modality, time, condition, qualification, theoretical concept, and attribution.

If those match, do not list the sentence for style.

## Hard rules

- Do not polish, expand, or co-author.
- Modify only the smallest span that restores equivalence. Do not replace a whole sentence when a phrase fix is enough.
- Do not break section order, section function, or the order of points inside a section. Do not merge, add, or retitle sections, or move a claim from A to B.
- Do not invent literature, DOI, pages, or data.
- Do not apply P1, P2, C, D, or E until the author selects IDs.
- After IDs, change only listed spans. No adjacent tidy-up. No unlisted synonym. No silent grammar patch. If a listed replacement will not parse unless unlisted words also change, stop and ask.
- 未经用户选择的修改不得进入最终稿. The final draft may contain only the source text plus spans rewritten or deleted by selected IDs. Unselected rows, noticed-but-unlist typos, and extra polish stay out.
- BTI is read-only. It has zero editing authority. It must not change any text, propose a replacement English sentence, or run P1/P2/C/D/E.
- AEC is read-only. Compare the machine-translated English of the author-revised text with the original AI English. Diagnose differences only. Do not edit the AI draft, the author text, or the final draft.
- Strength lock — keep may/might/could, suggest/indicate/show/demonstrate/prove, associated with/correlated with/causes, and scope words such as unless, under, in the national case. A strength or scope change is P1.
- Write lists in 简体中文. Quote English and Chinese as they stand.
- This skill overrides general prose-editing skills until the author chooses.

## Term source order

Body terminology (schools, models, lecture acronyms, running-text hyphenation)

1. Author lecture PDFs.
2. Other author course materials.
3. If absent there, the original academic source.
4. If still absent, an academic database or official page. Search only to verify the current term. Do not reopen the paper's argument.
5. No lecture file — ask once and mark 库.
6. Lecture vs library on a body term — propose the lecture form and note the library form.
7. Never invent a lecture term.

Bibliographic identity (published author, title, year, pages, document type)

Use the original publication. If the lecture form differs, list 讲座写法 vs 原始文献. Do not auto-pick.

See `references/lecture-terms.md`.

## Workflow

Word-count work is a later stage, not a reason to restyle the translation.

1. Bind the author-confirmed Chinese source and English draft to explicit versions. Collect any word maximum, minimum/target, included sections, citation-counting rule, required concepts, and optional course materials from the current brief. If no limit is given, count only; do not infer a 1000-word cap.
2. Build the lecture term list.
3. Run the translation-equivalence test. Build P1 and P2.
4. Run `python scripts/wordcount.py draft.txt` on a UTF-8 plain-text export of the agreed sections. Report both workflow counts, not Word/Docs/marker counts. To compare a stated maximum, pass `--limit N --basis full` or `--basis without_cite` explicitly. The latter is a heuristic: review all parenthetical groups containing 19xx/20xx years, including non-citations, before relying on it. Never silently drop paragraphs or references.
5. Only after the translation audit, if over the confirmed maximum, build C then D. Being below a maximum alone does not require additions. Build E only for missing required meaning or an explicit minimum/target; do not invent material to fill a count. Cuts outrank shortening.
6. Stop for IDs.
7. Apply only selected IDs, P then C then D then E, under list-lock. Re-count. If still off cap, return the next C/D or E list. Do not apply the next list.
8. After the author independently edits, run BTI and/or AEC if asked or if the required inputs are supplied. Neither replaces steps 3-7. Neither may edit any manuscript.

Follow `references/output-template.md` for Phase 1. Follow `references/bti-template.md` for Phase 3 BTI. Those files are audit output, not a rewrite.

There is no default cap. When close to an applicable boundary, compare with the required submission counter; do not assume a fixed five-word tolerance. This package includes a deterministic executor for explicitly selected, nonempty P1/P2 replacements in UTF-8 plain text. It includes optional independent local Argos machine translation. The current authorized assistant performs semantic review; there is no automatic cloud-review backend. C/D/E remain assistant-guided operations outside the deterministic executor. If an independent BTI/AEC translation is unavailable, name that missing input; do not label an unperformed independent translation as completed.

## List A — P1 Must fix

Use P1 only when the English

- mistranslates the Chinese;
- omits or adds information;
- changes subject, object, cause, logic, strength, or scope;
- confuses a theoretical concept;
- misnames a person, school, model, institution, or source;
- changes source type or attribution;
- states something the Chinese does not support.

For each P1 row give the English sentence, the Chinese source, the exact problem, a minimally corrected English sentence, and the term source (讲座 / 课程材料 / 原始文献 / 库 / 无中文对照).

The 最小改法 is the only text that may later replace the 英文原句 span. Write it so it can be dropped in without touching neighboring sentences.

## List B — P2 Optional technical correction

P2 is not a style pass. Allowed only for

- a clearly wrong term;
- wrong capitalization of a proper name;
- hyphenation that changes or materially affects meaning;
- grammar that makes the sentence ambiguous or misleading;
- citation format that affects source identification.

Do not use P2 to improve fluency, native-likeness, or academic tone. Understandable imperfect English stays.

The 建议替换 is the only fragment that may later replace the 原文片段 span.

## List C — Full-sentence deletion

Only after the translation audit, and only if over the cap. Delete a whole sentence in place. Do not move leftover text to another section.

Never propose deleting the research question, thesis, a key mechanism, a required comparison, an important qualifier, a scope limit, source attribution, or a required course concept. Read project-specific protected concepts from the current brief; do not import concepts from a previous course or paper.

Mark 删 or 可留 as advice only. `C-all` or a listed C ID from the author overrides that advice. Then delete that whole sentence and nothing else.

## List D — Minimal compression

Only if C is not enough. Shorten the same sentence in the same place. Keep names, numbers, dates, citations, the original claim, and every qualifier. Do not restyle the sentence to save words.

The 精简稿 is the only text that may later replace that sentence.

## List E — Restore only

Only if an explicit minimum/target requires restoration, or if required source meaning or a course-required point is missing. Being below a maximum is not itself a reason to add text. Restore a mechanism, distinction, or qualifier the Chinese, the draft, or the lecture already requires. Do not add a new implication or a new heading.

Insert only the listed sentence at the listed position.

## After the author replies

Accepted replies include `P1-all`, `P2-01`, `C-02`, `D-01`, `apply none`, or `P1 all P2 all C all`.

Treat `P1 all` as every P1 ID, `P2 all` as every P2 ID, `C all` as every C ID including rows marked 可留.

Then output only executed IDs, unexecuted IDs, the revised text, the new workflow count and the change from the previous count, and any remaining cap issue.

Do not re-argue unselected items unless the count is still off cap.

Do not add a new P/C/D/E row during the apply pass. Do not fix an error noticed during apply unless that span is already in a selected row.

## BTI — Back-translation integrity check

Independent post-editing audit. Diagnosis only. No prescription.

Inputs

- Original Chinese — sole semantic authority
- Original AI English — locator only, to see what the author changed
- Author-edited English — the text under audit
- Machine back-translation of the author-edited English — diagnostic reference only

The back-translation input may be only the author-edited English. Do not feed original AI English into the back-translation. If the author already supplies an independent back-translation, use that. If not, use an available, authorized independent translation tool with the author-edited English alone, then compare. Record the actual tool/version. If none is available, report the missing back-translation and stop BTI; do not fabricate a tool result.

Do not treat Chinese ≠ back-translation as an automatic error. Do not treat AI English ≠ author English as an automatic error. Open a finding only when the back-translation plus the English pair suggest that the author-edited English may have changed the Chinese meaning.

Check information loss or addition, subject/object, cause, comparison, condition, negation, modality, causal strength, scope, qualification, attribution, theoretical concept, endorsement, correlation vs causation, and general vs conditional claims.

Do not check native-ness, elegance, fluency, repetition, rhythm, cohesion, concision, or writing quality. Large style change with no meaning change is PASS. Do not ask the author to revert to the AI draft.

Labels — PASS, POSSIBLE DRIFT, MATERIAL DRIFT. Use MATERIAL DRIFT only when the meaning, scope, strength, attribution, or logical relation has clearly changed. Ambiguity is POSSIBLE DRIFT.

Every POSSIBLE DRIFT or MATERIAL DRIFT ends with Author decision required. Do not write 建议改为, 更好的表达, 应该写成, or any new English sentence.

Output only the BTI template. Then stop.

## AEC — Author-edit machine-English contrast

Read-only difference diagnosis. Zero editing authority.

When the author has self-revised a text, take the machine-translated English of that author version and contrast it with the original AI English draft.

Inputs

- Original AI English — baseline only
- Author-revised source — the text the author changed (Chinese or English)
- Machine-translated English of the author-revised source — the 机翻英文稿 under contrast

If the author-revised source is already English, compare it directly without a translation round trip.
For a Chinese source, if the author already supplies the 机翻英文稿, use that. If not, and an author-revised source exists, use an available, authorized independent translation tool on that source alone and record its actual tool/version. If unavailable, report the missing rendering and stop AEC. Do not feed the original AI English into that rendering.

Do not treat wording difference as an automatic error. Open a finding only when the two English texts appear to state different propositions, scope, strength, attribution, or logic.

Do not check native-ness, elegance, fluency, or academic tone. Do not write 建议改为 or any replacement sentence. Do not merge AEC findings into P1/P2/C/D/E. Do not change the final draft.

Labels — SAME CLAIM, WORDING ONLY, POSSIBLE DIVERGENCE, MATERIAL DIVERGENCE.

Every POSSIBLE DIVERGENCE or MATERIAL DIVERGENCE ends with Author decision required.

Output only `references/aec-template.md`. Then stop.

## Local workbench and agent execution

Use `python -m paperchoose serve --open` from this folder for the local selection page.
Optional local translation uses Argos models; the program does not automatically call a cloud AI.
Read `docs/AGENT_WORKFLOW.md` for translation, prepare/check/apply, and version binding.
A file-and-command-capable assistant can run these commands and produce strict JSON itself.
For the manual page route, export a request for the author-selected assistant.
Follow AUDIT_PROMPT.md in that request and do not change its input hashes.
Only return P1/P2 nonempty replacements to this executor. C/D/E and BTI/AEC are not accepted.
On the page, the author imports the result and selects IDs; all checkboxes begin unselected.
In agent mode, show the list and wait for explicit author selections before invoking apply.
The program rejects changed input versions, missing/ambiguous spans, missing Chinese quotes,
and overlapping selected spans. It creates a new output and verifies unchanged outside spans.
A quoted phrase existing in the source does not prove the suggested translation is correct.
See README.md for command-line prepare/check/apply and the exact schema.
