/**
 * Match what a player said to one of the options on screen. Runs entirely in the browser.
 * Two ways to answer: by position ("option two", "the first one", "last") or by saying the answer's words.
 * Returns null when nothing is a clear match, so the player is asked again instead of guessed for.
 */
export interface Match { index: number; score: number; via: 'position' | 'words' }

const NUMBER_WORDS: Record<string, number> = {
  one: 1, first: 1, won: 1, two: 2, second: 2, to: 2, too: 2, three: 3, third: 3, four: 4, fourth: 4, for: 4,
  '1': 1, '2': 2, '3': 3, '4': 4, '1st': 1, '2nd': 2, '3rd': 3, '4th': 4,
};
/** Filler around a position: "I'll go with option two, please." */
const CUES = new Set(['option', 'number', 'choice', 'answer', 'pick', 'choose', 'select', 'the', 'go', 'with', 'i', 'ill', 'id', 'take', 'say', 'please', 'lets', 'its', 'is', 'that', 'want', 'um', 'uh', 'ok', 'okay', 'one']);
const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'for', 'is', 'it', 'its', 'be', 'as', 'by', 'so', 'she', 'he', 'they', 'you', 'we', 'i', 'her', 'his', 'their', 'that', 'this', 'with', 'can', 'not', 'no', 'yes', 'are', 'was', 'from', 'up']);
/** Spoken numbers inside an answer ("four hours") match the digits on screen ("4 hours"). */
const DIGITS: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', forty: '40', eighty: '80' };

const words = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9.\s]/g, ' ').replace(/\.(?!\d)/g, ' ').split(/\s+/).filter(Boolean);
const stem = (w: string) => DIGITS[w] ?? (w.replace(/(ing|ed|es|s)$/, '') || w);
const content = (s: string) => new Set(words(s).filter((w) => !STOP.has(w)).map(stem));

/** "option two", "the second one", "number 3", "last": a position, when that's all the player said. */
const SOUNDALIKES = new Set(['to', 'too', 'for', 'won']);
function byPosition(said: string[], count: number): number | null {
  let nums = said.filter((w) => NUMBER_WORDS[w] !== undefined || w === 'last');
  // "I want to pick three": a real number beats a word that only sounds like one.
  const real = nums.filter((w) => !SOUNDALIKES.has(w));
  if (real.length) nums = real;
  const other = said.filter((w) => !CUES.has(w) && NUMBER_WORDS[w] === undefined && w !== 'last');
  if (other.length || !nums.length) return null;
  // "the second one": the ordinal wins over the trailing "one".
  const w = nums.find((x) => x !== 'one') ?? nums[0];
  if (nums.filter((x) => x !== 'one').length > 1) return null;
  if (w === 'last') return count - 1;
  const n = NUMBER_WORDS[w];
  return n >= 1 && n <= count ? n - 1 : null;
}

export function matchChoice(transcript: string, options: string[]): Match | null {
  const said = words(transcript);
  if (!said.length || !options.length) return null;
  const pos = said.length <= 8 ? byPosition(said, options.length) : null;
  if (pos !== null) return { index: pos, score: 1, via: 'position' };
  // Only numbers and filler ("option four", "one or two") was a position attempt that didn't land: ask again.
  if (said.every((w) => CUES.has(w) || NUMBER_WORDS[w] !== undefined || w === 'last' || w === 'or' || w === 'and')) return null;
  const heard = content(transcript);
  if (!heard.size) return null;
  const scores = options.map((o) => {
    const opt = content(o);
    let shared = 0;
    heard.forEach((w) => { if (opt.has(w)) shared++; });
    // Dice overlap, plus credit for how much of what was said lands in this option.
    return (2 * shared) / (heard.size + opt.size) * 0.6 + (shared / heard.size) * 0.4;
  });
  const ranked = scores.map((score, index) => ({ index, score })).sort((a, b) => b.score - a.score);
  const [best, next] = ranked;
  if (best.score < 0.3) return null;
  if (next && best.score - next.score < 0.08) return null;
  return { index: best.index, score: best.score, via: 'words' };
}

/** Best match across the recognizer's alternatives. */
export function matchAny(alternatives: string[], options: string[]): { match: Match; heard: string } | null {
  let best: { match: Match; heard: string } | null = null;
  for (const heard of alternatives) {
    const m = matchChoice(heard, options);
    if (m && (!best || m.score > best.match.score)) best = { match: m, heard };
  }
  return best;
}
