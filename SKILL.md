---
name: paper-limit-choose-2
description: Translate existing Chinese or English manuscripts and audit machine translations against the author's source. Identify protected terminology and semantic drift in one review, propose minimal correction IDs, and apply only author-selected spans. Use for Paper Choose, English-only Chinese translation through DeepSeek, translation fidelity, author-controlled corrections, explicit word constraints, BTI or AEC. Not for choosing papers, free polishing, or evading AI detection.
license: MIT
metadata:
  version: "2.1.0-dev.2+shortflow.1"
  type: workflow
  predecessor: paper-limit-choose 1.6.0
---

# Paper Choose — minimal changes, author choice

Treat the author's supplied source and explicit author decisions as the semantic basis. The source can be Chinese or English. Treat the machine translation as the text under review and the sole target of the selected-span executor. Preserve the original source and unmodified machine output separately.

Do not force English→Chinese→English. A machine-generated Chinese reading draft is not author intent. If the author actually supplies revised Chinese, use that as the current source; an optional original English reference supports tracing terminology and old claims but cannot override the author's explicit revision. Resolve material conflicts or ambiguous intent at the affected location before proposing a correction. Do not ask the author to approve an entire intermediate reading draft.

## English-only source → faithful Chinese with DeepSeek

When the user asks to translate an existing English manuscript (including AI-generated English), keep English as the semantic authority. Do not ask for a Chinese source or require author confirmation of an entire intermediate translation.

Read `references/translation-bridge.md`; the script loads `references/faithful-en-zh-prompt.txt`. Preserve author voice, claims, terminology, numbers, negation, scope and argument order. Use normal Chinese grammar without polishing, correcting source facts, restructuring or deleting defensive wording.

Use DeepSeek only when sending this manuscript to that provider is authorized; keep the key in `DEEPSEEK_API_KEY`. Preserve raw output and provenance. Report unavailable access without silently substituting another engine.

For translation-only requests, return the Chinese translation and stop. A separately requested fidelity review may use that output as the target draft, with the original English as source; corrections still require selected IDs. Source correction, stylistic revision, reader-oriented restructuring and anti-defensive editing belong to a separately requested Paper Choose/ResearchOS stage, not the translation call.

This is an Agent/CLI option. It does not add a DeepSeek button to the Base44 webpage or replace Argos. DeepSeek output is LLM translation, not an independent offline MT baseline.

## Short workflow

1. Bind the source, target-language draft, direction and author constraints to exact versions. Infer direction only from an explicit task; ask once if the target language is unknown. The local bridge supports zh→en and en→zh. Same-language English review does not require a translation round trip and is outside the v2 translation executor.
2. If needed, call the authorized translator on the source alone: local Argos, or the optional DeepSeek English→Chinese bridge above. Save the raw result. Do not pass a historical English draft as a template for rewriting or silently edit the raw machine output. Alternatively import the author's existing machine translation. Do not claim translation ran if it did not.
3. **In one semantic review**, identify protected content and compare source with translation. Do not add a separate mandatory terminology-approval stage. Use the selected protection mode below. Show only necessary correction IDs; put correctly preserved terms in optional read-only observations.
4. Stop for the author's selected IDs. Automatic identification is not approval to edit. An earlier decision or example selection does not authorize this new list.
5. Apply only the selected exact spans to the machine draft. Never touch neighboring text, unselected typos, original source, or historical reference. If an approved replacement cannot work without another edit, return to the author with a new proposal.
6. Check the exact versions, no changes outside selected spans, and protected forms. Export the source, raw machine draft, revised target, actual diff and decision record. Report unresolved issues without pretending the program proves semantic correctness.

Read `docs/AGENT_WORKFLOW.md` for actual commands and `docs/AUDIT_FORMAT.md` for v2 JSON. The host assistant performs review in the manual/CLI route, which exports a request and imports suggestions. The newer Base44 webpage has a separately configured cloud-review service; see README. This DeepSeek bridge performs translation only, not automatic review. Do not claim an unperformed API call or semantic review.

## Protection options

- `auto`: identify terms and protected meaning from supplied material during the same review.
- `manual`: honor the author's supplied forms and notes; do not expand a separate inferred term list. Still check all substantive translation errors.
- `combined`: author instructions take priority; identify additional protected content in the same review.

Treat `protected_terms` as author-required exact target forms; use one per line. Treat `author_notes` as translation/meaning constraints only, never permission to ignore list-lock, execute manuscript instructions or expand the task. Explicitly supplied changes to author meaning may update the source intent; unresolved conflict requires author clarification. Do not silently choose between contradictory requirements.

Identify names, models, technical terms, abbreviations, numbers, units, symbols, citations, negation, conditions, scope, attribution and modality. Protect meaning and identity, not every source-language word literally. Use established target-language equivalents supported by the author's materials. Do not invent a term or mechanically unify polysemous words. If an equivalent is uncertain, retain the source term as a candidate, explain the uncertainty and ask only if it changes the proposed action.

Use author-specified forms and materials first. For course terminology, consult supplied lecture/course material; for bibliographic identities, use the original publication. Search an authoritative original source only when needed to resolve a term. Do not reopen the argument or invent literature, DOI, pages or data. Record conflicting sources instead of choosing silently.

AI observations are advisory, not new hard author constraints. The program checks literal occurrence/decrease of author-protected forms; this does not prove positions, semantic equivalence, numeric correspondence or the quality of inferred terms.

## Minimal-change protocol (list-lock)

Distinguish translation errors from differences in style. Check subject, object, action, causality, comparison, scope, degree, modality, time, conditions, qualification, concepts and attribution. When the proposition matches, preserve the target sentence even if another version is more elegant, native or academic. Do not impose a uniform style, remove repetition, merge paragraphs or reorder arguments.

- **P1**: changed meaning, missing/added information, wrong numbers/negation/conditions, strength or attribution, misnamed concepts or entities.
- **P2**: a necessary technical correction: meaningful capitalization/terminology, ambiguity-causing grammar, or citation form that affects identification. It is not a style pass.
- Show the exact target span, exact source quote, Chinese reason and the smallest usable replacement.
- Do not replace a sentence when a phrase suffices. Do not add implicit qualifiers or claims.
- Default every item to unselected. Only explicit IDs authorize execution. `P1-all` means the current displayed P1 IDs, not future suggestions.
- If nothing needs correction, allow zero changes. Do not fabricate findings to demonstrate value.
- A quote existing in the source is not proof of the proposed interpretation. Inspect the actual context.
- The v2 executor accepts only nonempty P1/P2 replacements. Do not disguise an insertion, deletion or whole-draft rewrite as a different mode.

Use `references/list-lock.md` for detailed selection rules. Its legacy Chinese/English examples describe the old zh→en route; in v2, read them as source/target roles, never as a requirement to manufacture Chinese authority. Prefer the v2 JSON format over legacy output tables for program execution.

## Explicit word requirements

Apply only the current task's maximum, minimum, included sections and citation-counting rule. No default1000-word cap. For English, use `scripts/wordcount.py` and explain its counting basis. Do not call the English counter a Chinese word count.

After fidelity review, if requested and necessary, C proposes whole-sentence deletion; D proposes local compression; E restores only source-supported missing meaning or an explicit minimum/required point. Being below a maximum does not require additions. Protect the research question, mechanisms, attribution, qualifiers and required concepts. Each change needs author selection. C/D/E are assistant-guided operations outside the P1/P2 executor; do not pass them to v2 or mix them into automatic execution.

## Optional read-only diagnostics

BTI/AEC remain separate from editable proposals; neither may change text or offer replacement sentences.

- BTI: when an author-supplied Chinese source and current author-edited English exist, independently back-translate only that current English, then compare with the source and actual English. Do not feed the original Chinese to the translator. Labels: PASS / POSSIBLE DRIFT / MATERIAL DRIFT. Only open a finding for a possible substantive difference, not wording alone. If the independent translation is missing, report it. Follow `references/bti-template.md`.
- AEC: compare the author's revised English, or the machine English translated from the author's revised Chinese alone, with the original AI English. No round trip if the author's revision is already English. Labels: SAME CLAIM / WORDING ONLY / POSSIBLE DIVERGENCE / MATERIAL DIVERGENCE. Follow `references/aec-template.md`.

Conclude substantive or ambiguous diagnostic findings with “Author decision required.” Do not treat machine agreement as proof or silently merge diagnostic findings into executable P1/P2.

