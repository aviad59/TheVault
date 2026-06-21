const HEBREW_RE = /[֐-׿]/;

/** Direction to render text in, based on whether it contains Hebrew letters. */
export function dirOf(text: string): 'rtl' | 'ltr' {
  return HEBREW_RE.test(text) ? 'rtl' : 'ltr';
}
