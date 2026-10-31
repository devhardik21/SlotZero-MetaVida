# Antigravity Agent Directive: Medical UI System Guardrails

# Scope: Applies to all React + Tailwind frontend generation tasks

## 🚫 Forbidden AI-Generated Content ("Healthcare Slop")

- Do NOT use overused indigo, electric blue, or primary gradient buttons (#3b82f6 or similar standard SaaS blues).
- Do NOT generate typical hospital imagery placeholders, generic doctor illustrations, or uninspired 3-column card layouts.
- Do NOT write generic copy like "Your Health, Our Priority" or "Seamless Bookings". All copy must mimic an actual running medical system (e.g., "Available slots for Urgent Care today", "Board-certified Cardiology").
- Do NOT allow the agent to write raw arbitrary pixel margins/padding. Force the use of strict Tailwind layout tokens.

## 📐 Mandatory Design & Architecture Constraints

1. High-Density Split Screen: For the primary doctor search/booking interface, enforce an asymmetrical layout. Left side (35% width): Fixed, high-density filtering drawer for specialties, insurance networks, and live availability calendars. Right side (65% width): Scrollable, text-driven lists containing rich clinical profile data.
2. Anti-Modal Flow: Instead of throwing a bulky modal window for slot picking, require an inline, horizontal calendar-strip container on the card itself with micro-chips for: 'Available', 'Filling Fast', and 'Unavailable'.
3. Styling Palette: Anchor the theme to deep obsidian text (`text-neutral-900`), soft bone/slate backgrounds (`bg-neutral-50`), and highly intentional clinical secondary accents like muted sage or deep emerald greens (`text-emerald-700`). Use sharp, hairline borders (`border-neutral-200`) instead of loose dropshadows.

## 🔄 Antigravity Autonomous Browser Verification Pipeline

As the agent runs its visual check and takes screenshots:

1. The agent must verify that the viewport layout does not result in stacked container elements ("cards wrapped inside padding inside secondary cards").
2. The agent must explicitly verify that text sizes balance legibility with professional densities (prefer `text-xs` and `text-sm` for secondary doctor data tags over large text blocks).
3. If the browser recording yields an interface resembling a standard web template, the agent must automatically execute a rewrite focusing on flat UI structures.
