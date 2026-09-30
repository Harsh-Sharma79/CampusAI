# CampusAI visual direction

## Design movement

**Quiet intelligence**: a premium academic copilot that feels like a clear, well-designed study studio. It borrows the precision and craft of modern productivity software without imitating any one product. A sense of technology comes from considered data visualization, precise diagrams, and restrained motion—not neon overload or sci-fi decoration.

## Core principles

1. Make the next best learning action unmistakable.
2. Give study data space to breathe; favor legible hierarchy over dashboard density.
3. Treat academic content with calm, editorial clarity.
4. Make every interaction affirming, reversible where possible, and visibly responsive.
5. Use a coherent light and dark design, each intentionally art-directed.

## Color philosophy

Light theme: warm porcelain `#F8F9FC` page, white surfaces, slate/navy ink, quiet cool-gray borders, saturated indigo/violet actions, and pale blue as a secondary data hue. Dark theme: ink-navy `#101421` page, elevated blue-charcoal surfaces, soft off-white text, low-contrast slate borders, lavender/indigo actions, and a small amount of cool-blue glow reserved for the featured study recommendation. Status colors are muted green, amber and rose. Gradients are an accent, not a surface default. Charts reuse the same semantic series colors and readable grid/tooltip tokens in each theme.

## Layout paradigm

The public landing page uses an editorial centered grid, generous whitespace and an integrated product-preview composition. The authenticated application uses a narrow, collapsible left rail and wide, content-first canvas with a consistent top bar. Dashboard sections use a 12-column responsive grid, one dominant next-action panel, and compact supporting cards. Deep focus routes (quiz, flashcards, guided tutor) minimize chrome. Mobile uses a compact header and bottom navigation; no content may require horizontal scrolling.

## Signature elements

- A restrained, tiny indigo orbit/node motif representing connected knowledge.
- A “Next Best Action” gradient edge and fine focus halo used only on the primary recommendation.
- Thin progress tracks with a colored cap, tiny dots for completed study steps, and fine chart grid lines.
- Clean CSS/SVG knowledge-network glyph paired with an education/book silhouette.
- Rounded 16–22 px surfaces, hairline borders, soft layered shadows in light mode and lifted slate surfaces in dark mode.

## Interaction philosophy

Actions feel immediate and reversible. Controls have clear hover, focus-visible, pressed, selected and disabled states. Toasts confirm user intent; dialogs have deliberate focus entry and Escape handling. Motion explains change without delaying it. Study interactions are encouraging, never gamified with visual noise.

## Animation

Use short, subtle Framer Motion transitions: page opacity/vertical settling, card lift of only a few pixels, width/opacity progress movement, a small modal spring, and a 3D flip for flashcards. AI thinking uses three gently staggered points. The upload state moves through clear labeled steps. Respect `prefers-reduced-motion` by removing transforms and reducing transitions to near-instant fades.

## Typography system

Use a refined UI sans family (Inter/system sans fallback) for body and UI; a restrained high-contrast display face may be used only for marketing headline accents. Titles use crisp semibold weights and tight tracking, body copy uses comfortable line height, and numerals/metrics use tabular figures. Keep labels compact and consistent; reserve all-caps for tiny metadata eyebrow labels, not whole paragraphs.

## Brand essence and voice

**Calm, capable, encouraging, specific.** CampusAI speaks like a sharp tutor who respects the student's time: “Here's what deserves your attention today,” never vague praise or pressure. Every insight leads to a clear next action.

## Wordmark and logo

The wordmark is **CampusAI**, typeset in a clean semibold UI sans with “AI” in a subtle indigo/lavender accent when contrast permits. The symbol is a minimal filled open-book/graduation silhouette whose negative space forms a connected node/learning spark. Use a custom inline SVG/CSS header mark so the app logo renders crisply at any size. The project icon uses the same identity in a distinct opaque square with full-bleed midnight-navy background and a centered white/lavender symbol; no embedded text or inset badge. The same art becomes the favicon and managed project brand metadata.

## Signature brand color

Campus indigo `#6559E8`, supported by quiet periwinkle `#A6A2FF` and glacier blue `#78C6FF`. Use indigo for primary actions and active navigation; periwinkle mainly for dark-mode emphasis; glacier blue as a chart/knowledge-map secondary accent.
