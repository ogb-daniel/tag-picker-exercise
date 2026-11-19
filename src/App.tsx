import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { TagPicker } from "./TagPicker";
import { MORE_SKILLS, RECOMMENDATIONS, SKILLS } from "./data";

type Theme = "light" | "dark";

function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("light");
  const pick = (next: Theme) => {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };
  return (
    <div className="inline-flex gap-0.5 rounded-full border border-border bg-surface p-1 text-muted shadow-sm">
      <button
        type="button"
        className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all aria-pressed:bg-surface-2 aria-pressed:text-foreground aria-pressed:shadow-sm"
        aria-pressed={theme === "light"}
        onClick={() => pick("light")}
      >
        <Sun className="h-3.5 w-3.5" />
        Light
      </button>
      <button
        type="button"
        className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all aria-pressed:bg-surface-2 aria-pressed:text-foreground aria-pressed:shadow-sm"
        aria-pressed={theme === "dark"}
        onClick={() => pick("dark")}
      >
        <Moon className="h-3.5 w-3.5" />
        Dark
      </button>
    </div>
  );
}

export default function App() {
  const [skills, setSkills] = useState<string[]>(["Figma", "React"]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Tag Picker</h1>
          <p className="text-sm text-muted-2">Enhanced with keyboard nav, drag-reorder, categories & animations</p>
        </div>
        <ThemeSwitch />
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-base font-semibold">Edit Skills</h2>
        <p className="mb-4 text-sm text-muted">
          Pick the skills for your profile. Search, type comma-separated values, or browse by category.
        </p>
        <TagPicker
          options={SKILLS}
          searchOptions={MORE_SKILLS}
          value={skills}
          onChange={setSkills}
          recommendations={RECOMMENDATIONS}
          maxChars={100}
          allowCustom
        />
      </section>
    </main>
  );
}
