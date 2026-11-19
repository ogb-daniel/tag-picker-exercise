// Pure helpers for the tag picker. No React in here.

export type TagOption = { value: string; label: string; keywords?: readonly string[] };

/** "the same tag" = same text after trimming, collapsing spaces and lowercasing. */
export function tagSlug(t: string): string {
  return t.trim().replace(/\s+/g, " ").toLowerCase();
}

/** How many characters one tag costs against the budget. */
export type TagSize = (tag: string) => number;
const ownLength: TagSize = (tag) => tag.length;

/** Characters a list of tags spends. Separators are not counted. */
export function tagCharCount(tags: readonly string[], sizeOf: TagSize = ownLength): number {
  return tags.reduce((total, tag) => total + sizeOf(tag), 0);
}

/**
 * Apply the character budget the way the editor should: refuse NEW tags that
 * do not fit, but never drop a tag that is already selected. Otherwise
 * removing one tag from an over-budget list could silently remove others.
 */
export function fitTagAdditions(
  next: readonly string[],
  held: readonly string[],
  budget: number,
  sizeOf: TagSize = ownLength,
): string[] {
  const heldSlugs = new Set(held.map(tagSlug));
  const isHeld = (tag: string) => heldSlugs.has(tagSlug(tag));
  let used = tagCharCount(next.filter(isHeld), sizeOf);
  return next.filter((tag) => {
    if (isHeld(tag)) return true;
    if (used + sizeOf(tag) > budget) return false;
    used += sizeOf(tag);
    return true;
  });
}

/** A tag's words, normalized and sorted: "setup figma" and "Figma setup" match. */
const tokenKey = (value: string) => tagSlug(value).split(" ").filter(Boolean).sort().join(" ");

/**
 * The spelling typed text should be stored as, or null if it matches no known
 * option (then it is kept as a free-text tag). Exact match first, then the
 * same words in a different order.
 */
export function canonicalTagFor(typed: string, options: readonly TagOption[]): string | null {
  const slug = tagSlug(typed);
  if (!slug) return null;
  const exact = options.find((o) => tagSlug(o.value) === slug || tagSlug(o.label) === slug);
  if (exact) return exact.value;
  const key = tokenKey(typed);
  const reordered = options.find((o) => tokenKey(o.value) === key || tokenKey(o.label) === key);
  return reordered ? reordered.value : null;
}

/** Related tags for one tag, strongest first. `n` = how many people use both. */
export type RelatedTag = { tag: string; n: number };

export type TagRecommendations = {
  /** tagSlug -> the tags most often used alongside it. */
  related: Record<string, RelatedTag[]>;
  /** Most-used tags overall: what an empty box is shown. */
  popular: string[];
};

/**
 * What to recommend, given what is already selected. A tag related to MORE of
 * your picks ranks above one related very strongly to a single pick. Topped up
 * with the most popular tags.
 */
export function recommendTags(
  selected: readonly string[],
  { related, popular }: TagRecommendations,
  limit = 12,
): string[] {
  const held = new Set(selected.map(tagSlug));
  const scored = new Map<string, { tag: string; score: number; breadth: number }>();

  for (const pick of selected) {
    for (const { tag, n } of related[tagSlug(pick)] ?? []) {
      const slug = tagSlug(tag);
      if (held.has(slug)) continue;
      const prev = scored.get(slug);
      if (prev) {
        prev.score += n;
        prev.breadth += 1;
      } else {
        scored.set(slug, { tag, score: n, breadth: 1 });
      }
    }
  }

  const out = [...scored.values()]
    .sort((a, b) => b.breadth - a.breadth || b.score - a.score || a.tag.localeCompare(b.tag))
    .map((entry) => entry.tag);

  const taken = new Set(out.map(tagSlug));
  for (const tag of popular) {
    if (out.length >= limit) break;
    const slug = tagSlug(tag);
    if (held.has(slug) || taken.has(slug)) continue;
    taken.add(slug);
    out.push(tag);
  }
  return out.slice(0, limit);
}

/** Suggestions shown at once while typing. */
export const MAX_SUGGESTIONS = 24;

/**
 * Rank options against a typed query. Every word must appear, in any order.
 * `keywords` are hidden search aliases. Options in `catalog` (the always-visible
 * list) rank slightly higher.
 */
export function matchTagOptions(
  query: string,
  options: readonly TagOption[],
  { catalog, limit = MAX_SUGGESTIONS }: { catalog?: ReadonlySet<string>; limit?: number } = {},
): TagOption[] {
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  return options
    .map((option) => ({
      option,
      hay: [option.label, ...(option.keywords ?? [])].join(" ").toLowerCase(),
    }))
    .filter(({ hay }) => tokens.every((token) => hay.includes(token)))
    .map(({ option }) => {
      const label = option.label.toLowerCase();
      let rank = 0;
      if (label.startsWith(q)) rank -= 4;
      else if (label.includes(q)) rank -= 2;
      if (catalog?.has(option.value)) rank -= 1;
      return { option, rank };
    })
    .sort((a, b) =>
      a.rank - b.rank ||
      a.option.label.length - b.option.label.length ||
      a.option.label.localeCompare(b.option.label, "en", { sensitivity: "base", numeric: true }),
    )
    .slice(0, limit)
    .map(({ option }) => option);
}
