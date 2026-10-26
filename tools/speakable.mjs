// How a caption is said out loud: numbers, money, dates, and times as words, so the voice never reads "$1,000" as
// "dollar one comma zero zero zero". Captions keep the digits; voice.json stores this as the line's "say".
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORD = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
const MONTHS = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Sept: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };

export function words(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${words(n % 100)}` : ''}`;
  if (n < 1e6) return `${words(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${words(n % 1000)}` : ''}`;
  return `${words(Math.floor(n / 1e6))} million${n % 1e6 ? ` ${words(n % 1e6)}` : ''}`;
}
export function ordinal(n) {
  const w = words(n);
  const last = w.split(/[- ]/).pop();
  if (ORD[last]) return w.slice(0, -last.length) + ORD[last];
  if (last.endsWith('y')) return `${w.slice(0, -1)}ieth`;
  return `${w}th`;
}
const year = (y) => (y >= 2000 && y < 2010 ? words(y) : `${words(Math.floor(y / 100))} ${y % 100 < 10 ? `oh ${words(y % 100)}` : words(y % 100)}`);
const num = (s) => Number(s.replace(/,/g, ''));

// Acronyms said letter by letter, so the voice never guesses "Campus-hur" or "ferdic".
const LETTERS = { CampusHR: 'Campus H R', FERDC: 'F E R D C', PEBC: 'P E B C', HCM: 'H C M', HCMs: 'H C Ms', EC: 'E C', FTE: 'F T E' };

export function speakable(text) {
  let t = text.replace(new RegExp(`\\b(${Object.keys(LETTERS).join('|')})\\b`, 'g'), (w) => LETTERS[w]);
  // Money: "a $1,000 bonus" is "a one thousand dollar bonus"; $24.50 / $2,376 otherwise
  t = t.replace(/\b(a|an) \$(\d[\d,]*)\b(?!\.\d)/gi, (_, a, d) => `${a} ${words(num(d))} dollar`);
  t = t.replace(/\$(\d[\d,]*)(?:\.(\d{2}))?/g, (_, d, c) => {
    const dollars = num(d);
    const cents = c ? Number(c) : 0;
    return `${words(dollars)} ${dollars === 1 ? 'dollar' : 'dollars'}${cents ? ` and ${words(cents)} cents` : ''}`;
  });
  // Dates: Oct 21, Sept 27, October 21, with an optional year
  t = t.replace(new RegExp(`\\b(${Object.keys(MONTHS).join('|')}|${Object.values(MONTHS).join('|')})\\.? (\\d{1,2})(?:st|nd|rd|th)?\\b(,? (\\d{4}))?`, 'g'),
    (_, m, d, __, y) => `${MONTHS[m] ?? m} ${ordinal(Number(d))}${y ? `, ${year(Number(y))}` : ''}`);
  // Weekdays before a date: Sun November eighth is Sunday, November eighth
  const DAYS = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
  t = t.replace(new RegExp(`\\b(${Object.keys(DAYS).join('|')})\\b(?= (${Object.values(MONTHS).join('|')}) )`, 'g'), (d) => `${DAYS[d]},`);
  // Times: 5:00 PM, 11:30 AM
  t = t.replace(/\b(\d{1,2}):(\d{2})\s?(AM|PM)\b/g, (_, h, m, ap) => `${words(Number(h))}${m === '00' ? '' : ` ${Number(m) < 10 ? `oh ${words(Number(m))}` : words(Number(m))}`} ${ap === 'AM' ? 'A M' : 'P M'}`);
  // Years
  t = t.replace(/\b(19|20)(\d{2})\b/g, (y) => year(Number(y)));
  // Ordinals: the 18th, 21st
  t = t.replace(/\b(\d+)(st|nd|rd|th)\b/g, (_, n) => ordinal(Number(n)));
  // Forms: I-9, W-4
  t = t.replace(/\b([A-Z])-(\d+)\b/g, (_, l, n) => `${l} ${words(Number(n))}`);
  // Percent, decimals, hyphenated counts (4-hour), plain numbers
  t = t.replace(/\b(\d+)%/g, (_, n) => `${words(Number(n))} percent`);
  t = t.replace(/\b(\d+)\.(\d+)\b/g, (_, a, b) => (/^0+$/.test(b) ? words(Number(a)) : `${words(Number(a))} point ${b.split('').map((x) => ONES[Number(x)]).join(' ')}`));
  t = t.replace(/\b\d[\d,]*\b/g, (n) => words(num(n)));
  return t;
}
