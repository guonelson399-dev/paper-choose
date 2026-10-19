// Translation units preserve every source character and boundary. Only nonblank
// text is sent to Argos; separators are reattached exactly by mergeBatches.
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
        const boundaries = [...window.matchAll(/[.!?;:]["')\]]*\s+/g)];
        const last = boundaries.at(-1);
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
