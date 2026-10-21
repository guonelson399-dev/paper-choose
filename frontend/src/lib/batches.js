// Translation units preserve every source character and boundary. Only nonblank
// text is sent to Argos; separators are reattached exactly by mergeBatches.
// 输入是中文译稿：优先在换行处切分，其次在中英文句末标点处，最后在空格处。
const SENTENCE_END = /[.!?;:]["')\]]*\s+|[。！？；][”’」』）\])]*/g;

export function makeBatches(text, max) {
  if (!Number.isInteger(max) || max < 2) throw new Error('Invalid translation batch size');
  const batches = [];
  let rest = text;
  while (rest.length) {
    let cut = Math.min(rest.length, max);
    if (rest.length > max) {
      const window = rest.slice(0, max);
      const newline = window.lastIndexOf('\n');
      if (newline >= 0) cut = newline + 1;
      else {
        const last = [...window.matchAll(SENTENCE_END)].at(-1);
        const space = window.lastIndexOf(' ');
        cut = last ? last.index + last[0].length : space > 0 ? space + 1 : max;
      }
      // Never split a Unicode surrogate pair or a CRLF boundary.
      if (/^[\uDC00-\uDFFF]$/.test(rest[cut]) && /[\uD800-\uDBFF]/.test(rest[cut - 1])) cut--;
      if (rest[cut - 1] === '\r' && rest[cut] === '\n') cut--;
    }
    const unit = rest.slice(0, cut);
    const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(unit);
    batches.push({ prefix: match[1], text: match[2], sep: match[3] });
    rest = rest.slice(cut);
  }
  return batches;
}

export const mergeBatches = (batches, results) => results.map((t, i) =>
  (batches[i].prefix || '') + t + batches[i].sep).join('');