import type { TagOption, TagRecommendations } from "./lib/tags";

// Sample data. Replace freely; it only exists so the picker has something to show.

/** Always shown under the box. */
export const SKILLS: TagOption[] = [
  "Accessibility", "Adobe Illustrator", "After Effects", "Angular", "Animation",
  "Blender", "CSS", "Design systems", "Figma", "Framer", "GraphQL", "HTML",
  "Illustration", "Interaction design", "JavaScript", "Motion design", "Next.js",
  "Node.js", "Photoshop", "Prototyping", "Python", "React", "React Native",
  "Sketch", "Storybook", "Svelte", "Swift", "Tailwind CSS", "TypeScript",
  "UI design", "User research", "UX writing", "Vue", "Webflow", "Wireframing",
].map((label) => ({ value: label, label }));

/** Only found by typing. `keywords` are hidden search words. */
export const MORE_SKILLS: TagOption[] = [
  { value: "Usability testing", label: "Usability testing", keywords: ["user testing", "ux"] },
  { value: "Information architecture", label: "Information architecture", keywords: ["ia", "sitemap"] },
  { value: "Design tokens", label: "Design tokens", keywords: ["theme", "variables"] },
  { value: "Micro-interactions", label: "Micro-interactions", keywords: ["motion", "hover"] },
  { value: "Dark mode", label: "Dark mode", keywords: ["theme"] },
  { value: "Mobile app design", label: "Mobile app design", keywords: ["ios", "android"] },
  { value: "Landing pages", label: "Landing pages", keywords: ["marketing", "website"] },
  { value: "Figma setup", label: "Figma setup", keywords: ["install", "plugins"] },
  { value: "Jetpack Compose", label: "Jetpack Compose", keywords: ["android"] },
  { value: "SwiftUI", label: "SwiftUI", keywords: ["ios", "apple"] },
  { value: "Three.js", label: "Three.js", keywords: ["3d", "webgl"] },
  { value: "Lottie", label: "Lottie", keywords: ["animation"] },
];

const rel = (pairs: Array<[string, number]>) => pairs.map(([tag, n]) => ({ tag, n }));

/** "People who use X also use..." counts, keyed by lowercase tag. */
export const RECOMMENDATIONS: TagRecommendations = {
  popular: ["Figma", "React", "TypeScript", "CSS", "UI design", "Prototyping", "Tailwind CSS", "JavaScript"],
  related: {
    "figma": rel([["Prototyping", 40], ["UI design", 38], ["Design systems", 30], ["Wireframing", 22], ["Framer", 12]]),
    "react": rel([["TypeScript", 50], ["Next.js", 35], ["Tailwind CSS", 30], ["Storybook", 14], ["React Native", 10]]),
    "typescript": rel([["React", 50], ["Node.js", 26], ["Next.js", 24], ["GraphQL", 10]]),
    "ui design": rel([["Figma", 38], ["Design systems", 25], ["Interaction design", 18], ["Accessibility", 12]]),
    "prototyping": rel([["Figma", 40], ["Framer", 16], ["User research", 14], ["Interaction design", 12]]),
    "design systems": rel([["Storybook", 20], ["Figma", 30], ["Accessibility", 15], ["Tailwind CSS", 10]]),
    "tailwind css": rel([["React", 30], ["Next.js", 22], ["CSS", 18]]),
    "css": rel([["HTML", 45], ["JavaScript", 40], ["Animation", 12], ["Accessibility", 10]]),
    "user research": rel([["Wireframing", 20], ["UX writing", 12], ["Prototyping", 14]]),
    "motion design": rel([["After Effects", 30], ["Animation", 25], ["Framer", 10]]),
  },
};
