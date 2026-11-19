import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, GripVertical, Plus, Search, Sparkles, X } from "lucide-react";
import { cn } from "./lib/cn";
import {
  canonicalTagFor, fitTagAdditions, matchTagOptions, recommendTags, tagCharCount, tagSlug,
  type TagOption, type TagRecommendations,
} from "./lib/tags";

type Option = string | TagOption;

function optionShape(option: Option): TagOption {
  return typeof option === "string" ? { value: option, label: option } : option;
}

// ─── Highlight matching text ────────────────────────────────────────────────
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="search-highlight">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Character limit progress bar ──────────────────────────────────────────
function CharacterProgress({
  current,
  max,
  refused,
}: {
  current: number;
  max: number;
  refused: boolean;
}) {
  const pct = Math.min((current / max) * 100, 100);
  const isWarning = pct >= 80;
  const isDanger = pct >= 95 || refused;

  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out",
            isDanger ? "bg-danger" : isWarning ? "bg-[#e67e22]" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-2">
        {refused && (
          <span className="text-xs text-danger">
            Won't fit
          </span>
        )}
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums transition-colors",
            isDanger ? "font-medium text-danger" : "text-muted-2",
          )}
        >
          {current}/{max}
        </span>
      </div>
    </div>
  );
}

// ─── Category grouping for the options list ─────────────────────────────────
type Category = { label: string; tags: string[] };

const CATEGORIES: Category[] = [
  { label: "Design", tags: ["Figma", "Sketch", "Adobe Illustrator", "Photoshop", "Framer", "Webflow", "Blender", "UI design", "Interaction design", "Design systems", "Wireframing", "Prototyping"] },
  { label: "Development", tags: ["React", "React Native", "Next.js", "Vue", "Svelte", "Angular", "Node.js", "TypeScript", "JavaScript", "Python", "Swift", "HTML", "CSS", "Tailwind CSS", "GraphQL", "Storybook"] },
  { label: "Motion & Media", tags: ["Animation", "Motion design", "After Effects", "Illustration"] },
  { label: "Research & Writing", tags: ["User research", "UX writing", "Accessibility"] },
];

function categorize(opts: TagOption[]): { categorized: { label: string; options: TagOption[] }[]; uncategorized: TagOption[] } {
  const assigned = new Set<string>();
  const categorized = CATEGORIES.map((cat) => {
    const options = cat.tags
      .map((tag) => opts.find((o) => o.value === tag))
      .filter((o): o is TagOption => o !== undefined);
    options.forEach((o) => assigned.add(o.value));
    return { label: cat.label, options };
  }).filter((c) => c.options.length > 0);

  const uncategorized = opts.filter((o) => !assigned.has(o.value));
  return { categorized, uncategorized };
}

// ─── Main TagPicker ─────────────────────────────────────────────────────────
export function TagPicker({
  options,
  searchOptions = [],
  name,
  value,
  defaultValue = [],
  onChange,
  allowCustom = false,
  maxTagLength = 30,
  maxChars,
  recommendations,
  inputPlaceholder = "Search skills…",
  className,
}: {
  options: readonly Option[];
  searchOptions?: readonly Option[];
  name?: string;
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  allowCustom?: boolean;
  maxTagLength?: number;
  maxChars?: number;
  recommendations?: TagRecommendations;
  inputPlaceholder?: string;
  className?: string;
}) {
  const opts = options.map(optionShape);
  const searchable: TagOption[] = (() => {
    const seen = new Set(opts.map((option) => tagSlug(option.value)));
    const extra = searchOptions.map(optionShape).filter((option) => {
      const slug = tagSlug(option.value);
      if (seen.has(slug)) return false;
      seen.add(slug);
      return true;
    });
    return [...opts, ...extra];
  })();
  const catalogValues = new Set(opts.map((option) => option.value));

  const [internal, setInternal] = useState(defaultValue);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [refused, setRefused] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [removingTag, setRemovingTag] = useState<string | null>(null);

  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  const selected = value ?? internal;

  const labelFor = (tag: string) => opts.find((option) => option.value === tag)?.label ?? tag;
  const sizeOf = (tag: string) => labelFor(tag).length;

  const commit = (tags: string[]) => {
    const seen = new Set<string>();
    const unique = tags.filter((tag) => {
      const slug = tagSlug(tag);
      if (!slug || seen.has(slug)) return false;
      seen.add(slug);
      return true;
    });
    const fitted = maxChars === undefined ? unique : fitTagAdditions(unique, selected, maxChars, sizeOf);
    setRefused(fitted.length < unique.length);
    if (value === undefined) setInternal(fitted);
    onChange?.(fitted);
  };

  const has = (tag: string) => selected.some((item) => tagSlug(item) === tagSlug(tag));

  const remove = (tag: string) => {
    setRemovingTag(tag);
    // Announce removal
    if (liveRef.current) liveRef.current.textContent = `Removed ${labelFor(tag)}`;
    setTimeout(() => {
      commit(selected.filter((item) => tagSlug(item) !== tagSlug(tag)));
      setRemovingTag(null);
    }, 150);
  };

  const add = (tag: string) => {
    // Announce addition
    if (liveRef.current) liveRef.current.textContent = `Added ${labelFor(tag)}`;
    setRecentlyAdded((prev) => new Set(prev).add(tag));
    setTimeout(() => setRecentlyAdded((prev) => {
      const next = new Set(prev);
      next.delete(tag);
      return next;
    }), 300);
    commit([...selected, tag]);
  };

  const toggle = (tag: string) => has(tag) ? remove(tag) : add(tag);

  const addDraft = (raw: string) => {
    const additions = raw
      .split(",")
      .map((item) => item.trim().replace(/\s+/g, " ").slice(0, maxTagLength).trim())
      .filter(Boolean);
    setDraft("");
    setHighlightIdx(-1);
    if (!additions.length) return;

    const next = [...selected];
    for (const addition of additions) {
      const canonical = canonicalTagFor(addition, searchable);
      if (canonical) next.push(canonical);
      else if (allowCustom) next.push(addition);
    }
    // Mark newly added tags for animation
    const newTags = next.filter((t) => !selected.some((s) => tagSlug(s) === tagSlug(t)));
    if (newTags.length) {
      setRecentlyAdded((prev) => {
        const next = new Set(prev);
        newTags.forEach((t) => next.add(t));
        return next;
      });
      setTimeout(() => setRecentlyAdded((prev) => {
        const next = new Set(prev);
        newTags.forEach((t) => next.delete(t));
        return next;
      }), 300);
    }
    commit(next);
  };

  // Only the last comma-separated part drives the suggestions.
  const q = (draft.split(",").at(-1) ?? "").trim().toLowerCase();
  const matches = matchTagOptions(
    q,
    searchable.filter((option) => !has(option.value)),
    { catalog: catalogValues },
  );

  const charCount = tagCharCount(selected, sizeOf);
  const room = maxChars === undefined ? Infinity : maxChars - charCount;
  const recommended = recommendations
    ? recommendTags(selected, recommendations).filter((tag) => sizeOf(tag) <= room)
    : [];

  // Reset highlight when matches change
  useEffect(() => { setHighlightIdx(-1); }, [q]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[role='option']");
      items[highlightIdx]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx]);

  const chooseSuggestion = (option: { value: string; label: string }) => {
    const entries = draft.split(",");
    entries[entries.length - 1] = option.label;
    addDraft(entries.join(","));
  };

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < matches.length) {
        chooseSuggestion(matches[highlightIdx]);
      } else {
        addDraft(draft);
      }
    } else if (event.key === "Escape") {
      if (focused && q) event.preventDefault();
      setFocused(false);
      setHighlightIdx(-1);
    } else if (event.key === "Backspace" && !draft && selected.length) {
      remove(selected.at(-1)!);
    } else if (event.key === "ArrowDown" && q && matches.length) {
      event.preventDefault();
      setHighlightIdx((prev) => (prev + 1) % matches.length);
    } else if (event.key === "ArrowUp" && q && matches.length) {
      event.preventDefault();
      setHighlightIdx((prev) => (prev <= 0 ? matches.length - 1 : prev - 1));
    }
  };

  // Drag & drop reorder
  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };
  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const next = [...selected];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    if (value === undefined) setInternal(next);
    onChange?.(next);
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  const toggleCategory = (label: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const { categorized, uncategorized } = categorize(opts);

  // ── Render: Search result pill ──────────────────────────────────────────
  const searchPill = (
    option: TagOption,
    idx: number,
  ) => (
    <button
      key={option.value}
      type="button"
      role="option"
      aria-selected={idx === highlightIdx}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={() => setHighlightIdx(idx)}
      onClick={() => chooseSuggestion(option)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
        idx === highlightIdx
          ? "bg-primary-soft text-primary"
          : "text-foreground hover:bg-surface-2",
      )}
    >
      <Plus className="h-3.5 w-3.5 shrink-0 text-muted-2" />
      <span className="flex-1">
        <HighlightMatch text={option.label} query={q} />
      </span>
      {option.keywords && option.keywords.length > 0 && (
        <span className="text-xs text-muted-2">
          {option.keywords.slice(0, 2).join(", ")}
        </span>
      )}
    </button>
  );

  // ── Render: Option pill for the grid ────────────────────────────────────
  const optionPill = (
    option: TagOption,
    { on, tabIndex }: { on: boolean; tabIndex?: number },
  ) => (
    <button
      key={option.value}
      type="button"
      tabIndex={tabIndex}
      onClick={() => toggle(option.value)}
      className={cn(
        "focus-ring inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all duration-150",
        on
          ? "border-primary/30 bg-primary-soft font-medium text-primary shadow-sm"
          : "border-border bg-surface text-muted hover:border-primary/20 hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <span>{option.label}</span>
      {on
        ? <Check className="h-3.5 w-3.5" aria-hidden />
        : <Plus className="h-3.5 w-3.5 text-muted-2" />
      }
    </button>
  );

  return (
    <div className={className}>
      {name && <input type="hidden" name={name} value={selected.join(",")} />}

      {/* Screen reader live region */}
      <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* ── Input area with selected tags ───────────────────────────────── */}
      <div className="relative">
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-xl border bg-surface px-3 py-2.5 shadow-sm transition-all duration-200",
            focused
              ? "border-primary ring-2 ring-primary/20"
              : "border-border hover:border-muted-2/50",
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {selected.map((tag, idx) => (
            <span
              key={tag}
              draggable
              onDragStart={handleDragStart(idx)}
              onDragOver={handleDragOver(idx)}
              onDrop={handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                "group inline-flex cursor-grab items-center gap-1 rounded-lg border px-2 py-1 text-sm font-medium transition-all duration-150 active:cursor-grabbing",
                recentlyAdded.has(tag) && "pill-enter",
                removingTag === tag && "pill-exit",
                dragIdx === idx && "opacity-50",
                dragOverIdx === idx && dragIdx !== idx && "ring-2 ring-primary/40",
                "border-primary/20 bg-primary-soft text-primary",
              )}
            >
              <GripVertical className="h-3 w-3 shrink-0 text-primary/30 opacity-0 transition-opacity group-hover:opacity-100 max-sm:hidden" aria-hidden />
              <span className="select-none">{labelFor(tag)}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(tag); }}
                aria-label={`Remove ${labelFor(tag)}`}
                className="focus-ring -mr-0.5 rounded-full p-0.5 text-primary/50 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          <div className="flex min-w-[12ch] flex-1 items-center gap-1.5">
            <Search className="h-4 w-4 shrink-0 text-muted-2" />
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setRefused(false); }}
              onFocus={() => setFocused(true)}
              onKeyDown={handleKeyDown}
              onBlur={() => { setFocused(false); addDraft(draft); }}
              placeholder={selected.length ? "Add more…" : inputPlaceholder}
              role="combobox"
              aria-expanded={focused && Boolean(q)}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={highlightIdx >= 0 ? `${listboxId}-${highlightIdx}` : undefined}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-foreground outline-none placeholder:text-muted-2 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* ── Character limit progress ───────────────────────────────────── */}
      {maxChars !== undefined && (
        <CharacterProgress current={charCount} max={maxChars} refused={refused} />
      )}

      {/* ── Search results dropdown ────────────────────────────────────── */}
      {focused && q && (
        <div
          id={listboxId}
          ref={listRef}
          role="listbox"
          className="dropdown-enter custom-scrollbar mt-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          {matches.length > 0 ? (
            <div className="flex flex-col">
              {matches.map((option, idx) => searchPill(option, idx))}
            </div>
          ) : (
            <p className="px-3 py-3 text-center text-sm text-muted-2">
              {allowCustom
                ? <>Press <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-xs font-medium">Enter</kbd> to add "{(draft.split(",").at(-1) ?? "").trim()}"</>
                : "No matches found"
              }
            </p>
          )}
        </div>
      )}

      {/* ── Options panel (hidden during search) ───────────────────────── */}
      <div className={cn("mt-3", q && focused && "hidden")}>
        {/* Recommendations */}
        {recommended.length > 0 && (
          <div className="mb-3 rounded-xl border border-border bg-surface p-3">
            <div className="mb-2.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-muted">
                {selected.length ? "Suggested for you" : "Most popular"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recommended.map((tag) => optionPill(
                { value: tag, label: tag },
                { on: false, tabIndex: 0 },
              ))}
            </div>
          </div>
        )}

        {/* Categorized options */}
        <div className="custom-scrollbar max-h-72 overflow-y-auto rounded-xl border border-border bg-surface p-3">
          {categorized.map((cat) => (
            <div key={cat.label} className="mb-3 last:mb-0">
              <button
                type="button"
                onClick={() => toggleCategory(cat.label)}
                className="focus-ring mb-2 flex w-full items-center gap-1.5 rounded-md px-1 text-left"
              >
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-muted-2 transition-transform duration-200",
                  collapsedCats.has(cat.label) && "-rotate-90",
                )} />
                <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
                  {cat.label}
                </span>
                <span className="text-xs text-muted-2">
                  ({cat.options.filter((o) => has(o.value)).length}/{cat.options.length})
                </span>
              </button>
              {!collapsedCats.has(cat.label) && (
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {cat.options.map((option) => optionPill(option, {
                    on: has(option.value),
                    tabIndex: 0,
                  }))}
                </div>
              )}
            </div>
          ))}
          {uncategorized.length > 0 && (
            <div className="mb-0">
              <p className="mb-2 flex items-center gap-1.5 px-1">
                <ChevronDown className="h-3.5 w-3.5 text-muted-2" />
                <span className="text-xs font-semibold tracking-wide text-muted-2 uppercase">
                  Other
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5 pl-1">
                {uncategorized.map((option) => optionPill(option, {
                  on: has(option.value),
                  tabIndex: 0,
                }))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Selected count summary ─────────────────────────────────────── */}
      {selected.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-2">
          <span>{selected.length} skill{selected.length !== 1 && "s"} selected</span>
          <button
            type="button"
            onClick={() => { commit([]); if (liveRef.current) liveRef.current.textContent = "All skills removed"; }}
            className="focus-ring rounded-md px-2 py-1 text-danger transition-colors hover:bg-danger/10"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
