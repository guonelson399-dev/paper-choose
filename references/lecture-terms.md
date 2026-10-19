# Lecture term extraction

Use this when the author supplies lecture PDFs, slides, or weekly handouts.

## Extract

Prefer text extraction over guessing from memory.

```bash
pdftotext -layout lecture.pdf lecture.txt
```

If the PDF is scanned or `pdftotext` returns little text, use the pdf skill OCR path.

Read headings, bullet terms, named models, and author-year slides first. Ignore decorative headers and week banners unless they contain a name.

## What counts as a lecture proper noun

- Person names (from the current materials)
- School and camp labels (from the current materials)
- Model and mechanism names (from the current materials)
- Institution names as the lecture writes them (from the current materials)
- The lecture's own acronyms and hyphenation

Do not harvest ordinary English from lecture prose and treat it as a required term.

## Match against the draft

For each draft proper noun

1. Search the lecture text for the same person, school, or model.
2. If found, the suggested replacement is the lecture string, including hyphenation and capitalisation.
3. If not found in any supplied lecture file, search a library source.
4. Write the source on the P1/P2 row.

## Two tracks

- Body terminology — lecture form first.
- Bibliographic identity (published author name, title, year, document type) — original publication first.
- If the two tracks disagree, list 讲座写法 and 原始文献. Do not auto-pick.

## Conflicts

| Situation | Action |
|---|---|
| Body term, lecture has one spelling | Use lecture spelling |
| Body term, lecture has two spellings | P2; list both; do not pick silently |
| Body term, lecture differs from Scholar / Crossref | Propose lecture form; note library form |
| Bibliographic identity differs from the lecture slide | Propose the publication identity; note the lecture form |
| Term absent from lectures | Library search; mark 库 |
| No lecture file given | Ask once; mark 库 for this pass |
| Cannot read the PDF | Say so; do not invent lecture quotes |

## Output snippet

In section 1 of the reply, name the lecture files used and how many proper nouns were taken from them. Example

- 讲座文件：provided_lecture_01.pdf, provided_lecture_02.pdf
- 讲座命中：18
- 库补查：4
- 未能核实：1
