---
name: Wise
colors:
  primary: "#9fe870"
  secondary: "#0e0f0c"
  success: "#054d28"
  danger: "#d03238"
  warning: "#ffd11a"
  info: "#38c8ff"
  background: "#ffffff"
  surface: "#ffffff"
  canvas: "#fafafa"
  bone: "#f0f1ee"
  card: "#ffffff"
  dark: "#e8ebe6"
  deep: "#d5d9d2"
  ink: "#0e0f0c"
  body: "#0e0f0c"
  charcoal: "#2a2b27"
  mute: "#686868"
  ash: "#5a5b58"
  stone: "#767676"
  foreground: "#0e0f0c"
  on-primary: "#163300"
  on-secondary: "#ffffff"
  on-background: "#0e0f0c"
  on-surface: "#0e0f0c"
  on-dark: "#fcfcfc"
  on-dark-mute: "rgba(252, 252, 252, 0.72)"
  link: "#2d7a1a"
  ring-focus: "rgba(22, 51, 0, 0.6)"
  hero-warm: "#ffc091"
  hero-glow: "#9fe870"
  hero-pink: "#e2f6d5"
  badge-success: "#054d28"
  badge-warning: "#ffd11a"
  badge-info: "#38c8ff"
  hairline: "rgba(14, 15, 12, 0.04)"
  divider: "rgba(14, 15, 12, 0.08)"
colors-dark:
  primary: "#9fe870"
  secondary: "#e8ebe6"
  success: "#054d28"
  danger: "#d03238"
  warning: "#ffd11a"
  info: "#38c8ff"
  background: "#0e0f0c"
  surface: "#1e201c"
  canvas: "#141411"
  bone: "#1e201c"
  card: "#1e201c"
  dark: "#0e0f0c"
  deep: "#11120f"
  ink: "#e8ebe6"
  body: "#e8ebe6"
  charcoal: "#d0d3ce"
  mute: "#898989"
  ash: "#8a8d88"
  stone: "#848484"
  foreground: "#e8ebe6"
  on-primary: "#163300"
  on-secondary: "#0e0f0c"
  on-background: "#e8ebe6"
  on-surface: "#e8ebe6"
  on-dark: "#fcfcfc"
  on-dark-mute: "rgba(252, 252, 252, 0.72)"
  link: "#b3f08a"
  ring-focus: "rgba(159, 232, 112, 0.5)"
  hero-warm: "#ffc091"
  hero-glow: "#9fe870"
  hero-pink: "#e2f6d5"
  badge-success: "#054d28"
  badge-warning: "#ffd11a"
  badge-info: "#38c8ff"
  hairline: "rgba(232, 235, 230, 0.03)"
  divider: "rgba(232, 235, 230, 0.08)"
typography:
  display-xxl:
    fontFamily: "Geist, Inter, sans-serif"
    fontSize: "7.875rem"
    fontWeight: 900
    lineHeight: 0.85
    letterSpacing: "normal"
  display-xl:
    fontFamily: "Geist, Inter, sans-serif"
    fontSize: "6rem"
    fontWeight: 900
    lineHeight: 0.85
    letterSpacing: "normal"
  display-lg:
    fontFamily: "Geist, Inter, sans-serif"
    fontSize: "4rem"
    fontWeight: 900
    lineHeight: 0.85
    letterSpacing: "normal"
  display-md:
    fontFamily: "Geist, Inter, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 900
    lineHeight: 0.85
    letterSpacing: "normal"
  body-lg:
    fontFamily: "Inter, Helvetica, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.44
    letterSpacing: "0.18px"
  body-md:
    fontFamily: "Inter, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.44
    letterSpacing: "normal"
  body-sm:
    fontFamily: "Inter, Helvetica, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  button-md:
    fontFamily: "Inter, Helvetica, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.108px"
  button-sm:
    fontFamily: "Inter, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.108px"
  caption:
    fontFamily: "Inter, Helvetica, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "-0.084px"
  code-md:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  code-sm:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
spacing:
  xxs: "0.25rem"
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  xxl: "3rem"
  xxxl: "4rem"
  section: "6rem"
  band: "8rem"
rounded:
  none: "0"
  xs: "2px"
  sm: "10px"
  md: "16px"
  lg: "30px"
  xl: "40px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "16px 28px"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "16px 28px"
    height: "52px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.full}"
    padding: "16px 28px"
    height: "52px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "48px"
  textarea:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "48px"
  checkbox:
    rounded: "{rounded.sm}"
  radio:
    rounded: "{rounded.full}"
  switch:
    rounded: "{rounded.full}"
  badge:
    backgroundColor: "{colors.badge-success}"
    textColor: "{colors.on-dark}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
    height: "24px"
  badge-warning:
    backgroundColor: "{colors.badge-warning}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
    height: "24px"
  badge-info:
    backgroundColor: "{colors.badge-info}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
    height: "24px"
  tabs:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.charcoal}"
    typography: "{typography.button-sm}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.body}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "24px"
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.xl}"
    padding: "32px"
  avatar:
    rounded: "{rounded.full}"
  progress:
    backgroundColor: "{colors.dark}"
    rounded: "{rounded.sm}"
    height: "8px"
  alert-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "16px"
  alert-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "16px"
  alert-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "16px"
---

## Overview

Wise is a bold, confident fintech platform built on the philosophy of "money without borders." The design language rejects the conservative, risk-averse aesthetic of traditional banking in favor of something fresher, greener, and distinctly modern. Every visual decision — from the lime-bright primary accent to the ultra-bold display typography — communicates speed, transparency, and global ambition.

The emotional palette is **energetic yet trustworthy.** The signature Wise Green {colors.primary} is a lime-bright color that feels neither corporate nor casual — it lands in a sweet spot between growth and approachability. Paired with a near-black {colors.ink} for text and crisp white {colors.background} canvas, the interface feels surgical, open, and charged with intention. This is fintech that doesn't whisper — it announces itself with a confident handshake and a clear rate.

## Colors

### Brand & Accent

The palette is anchored by a single dominant accent: **Wise Green** {colors.primary}, a fresh lime-green hue at the intersection of vitality and reliability. At hex `#9fe870`, it reads as neither fluorescent nor muted — a balanced, premium green that signals growth without the tired banking cliché of dark forest green.

The primary token powers all primary CTAs, selected states, and signature brand moments. Text on green surfaces uses the deeply saturated **Dark Green** {colors.on-primary} (`#163300`) — a nature-inspired contrast that creates legible, grounded call-to-action text. This green-on-green CTA approach is intentionally unconventional, replacing the usual white-on-green with a darker, more organic tone that feels bespoke rather than templated.

Supporting the brand accent are three **hero gradient accents** designed for atmospheric backgrounds and decorative sections: {colors.hero-warm} (`#ffc091`, a warm peach), {colors.hero-glow} (`#9fe870`, the primary green itself), and {colors.hero-pink} (`#e2f6d5`, a pale mint). These form a warm-to-cool gradient ribbon that can backdrop hero sections, value propositions, and brand storytelling blocks without competing with the primary accent.

The {colors.link} token (`#2d7a1a`) controls all hyperlink styling — a darker, deeply saturated green that maintains brand alignment while providing the required color contrast for accessibility. Hover states reduce opacity to 80% rather than changing color, preserving brand consistency.

### Surface

The surface hierarchy in light mode builds from a pure white foundation:

| Token | Value | Usage |
|-------|-------|-------|
| {colors.background} | `#ffffff` | Primary page canvas |
| {colors.canvas} | `#fafafa` | Secondary page areas, inset groups |
| {colors.bone} | `#f0f1ee` | Tertiary backgrounds, card group containers |
| {colors.card} | `#ffffff` | Card surfaces, elevated containers |
| {colors.surface} | `#ffffff` | Default component surface |
| {colors.dark} | `#e8ebe6` | Darker surface variant, progress tracks |
| {colors.deep} | `#d5d9d2` | Deepest surface, footer backgrounds |

In dark mode, the hierarchy inverts while preserving the same structural relationships:

| Token | Light | Dark |
|-------|-------|------|
| {colors.background} | `#ffffff` | `#0e0f0c` |
| {colors.canvas} | `#fafafa` | `#141411` |
| {colors.bone} | `#f0f1ee` | `#1e201c` |
| {colors.card} | `#ffffff` | `#1e201c` |
| {colors.surface} | `#ffffff` | `#1e201c` |
| {colors.dark} | `#e8ebe6` | `#0e0f0c` |
| {colors.deep} | `#d5d9d2` | `#11120f` |

The dark mode surface system replaces pure black with warm near-black tones (`#0e0f0c` background, `#1e201c` surface). This creates depth through subtle luminosity contrast rather than hard edges — surfaces appear to sit on top of one another, not cut against each other.

### Text

The text hierarchy uses six distinct levels of contrast, each tuned for a specific reading context:

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| {colors.ink} | `#0e0f0c` | `#e8ebe6` | Primary text, headlines |
| {colors.body} | `#0e0f0c` | `#e8ebe6` | Long-form body copy |
| {colors.charcoal} | `#2a2b27` | `#d0d3ce` | Captions, secondary labels |
| {colors.mute} | `#686868` | `#898989` | Supporting text, helper text |
| {colors.ash} | `#5a5b58` | `#8a8d88` | Tertiary information, metadata |
| {colors.stone} | `#767676` | `#848484` | Disabled text, placeholder content |

The {colors.ink} and {colors.body} tokens share the same near-black value in both modes — a confident, deliberate choice that prioritizes maximum readability for the most critical content. Secondary tokens like {colors.charcoal} and {colors.mute} introduce graduated contrast for information hierarchy without relying on font-size changes alone.

### Semantic

Semantic colors follow a clear, universally understood pattern:

| Token | Value | Use Case |
|-------|-------|----------|
| {colors.success} | `#054d28` | Positive actions, success states, confirmation badges |
| {colors.danger} | `#d03238` | Errors, destructive actions, deletion warnings |
| {colors.warning} | `#ffd11a` | Cautionary notices, pending states, rate change alerts |
| {colors.info} | `#38c8ff` | Informational banners, tooltips, help indicators |

Badge variants for each semantic state ensure consistent pill-shaped labels: {colors.badge-success} (`#054d28`), {colors.badge-warning} (`#ffd11a`), and {colors.badge-info} (`#38c8ff`). The {colors.danger} badge intentionally reuses the primary danger token for consistency — every red element communicates the same level of urgency.

The focus ring {colors.ring-focus} (`rgba(22, 51, 0, 0.6)` in light, `rgba(159, 232, 112, 0.5)` in dark) uses a semi-transparent green tint rather than the industry-standard blue. This brand-aligned focus indicator ensures keyboard navigation feels like a native part of the design system, not an accessibility bolt-on.

## Typography

### Font Family

The type system is built on two complementary font families that serve distinct roles:

**Geist** (display stack) — A modern geometric sans-serif purpose-built for headlines and brand typography. Its precise, confident letterforms mirror the fintech personality of Wise: direct, efficient, borderless. Geist leads the display stack at {typography.fontFamily.display}, followed by **Inter** and generic `sans-serif` as fallback.

**Inter** (body stack) — A highly legible, neutral sans-serif designed for UI interfaces. Inter serves as the workhorse for all body copy, buttons, captions, and UI labels at {typography.fontFamily.body}. It is loaded at weights 400, 500, 600, and 900 to support the full typographic range. The substitutes chain is `Helvetica, Arial, sans-serif` — widely available system fonts that preserve geometric character when Inter is unavailable.

**JetBrains Mono** (mono stack) — A developer-focused monospace font with distinctive ligatures and clear character differentiation. Used exclusively for code blocks, transaction IDs, and technical data displays at {typography.fontFamily.mono}.

### Hierarchy

| Token | Font Family | Size | Weight | Line Height | Letter Spacing | Use |
|-------|-------------|------|--------|-------------|----------------|-----|
| {typography.display-xxl} | Geist, Inter | 7.875rem (126px) | 900 | 0.85 | normal | Hero headlines, brand statements, large marketing pages |
| {typography.display-xl} | Geist, Inter | 6rem (96px) | 900 | 0.85 | normal | Section hero headers, feature page titles |
| {typography.display-lg} | Geist, Inter | 4rem (64px) | 900 | 0.85 | normal | Major section headings, modal headers |
| {typography.display-md} | Geist, Inter | 2.5rem (40px) | 900 | 0.85 | normal | Card headings, subsection titles |
| {typography.body-lg} | Inter | 1.125rem (18px) | 400 | 1.44 | 0.18px | Lead copy, feature descriptions |
| {typography.body-md} | Inter | 1rem (16px) | 400 | 1.44 | normal | Base body text, paragraph content |
| {typography.body-sm} | Inter | 0.875rem (14px) | 400 | 1.55 | normal | Secondary text, helper content |
| {typography.button-md} | Inter | 1.125rem (18px) | 600 | 1 | -0.108px | Primary and secondary buttons |
| {typography.button-sm} | Inter | 1rem (16px) | 600 | 1 | -0.108px | Small buttons, inline actions |
| {typography.caption} | Inter | 0.875rem (14px) | 600 | 1.55 | -0.084px | Labels, metadata, timestamps |
| {typography.code-md} | JetBrains Mono | 0.875rem (14px) | 400 | 1.55 | normal | Inline code, transaction hashes |
| {typography.code-sm} | JetBrains Mono | 0.75rem (12px) | 400 | 1.55 | normal | Code captions, small technical data |

### Principles

**The Extreme Weight Contrast Principle.** Display tokens use weight 900 (black) exclusively — the heaviest available weight — against body text at weight 400. This creates maximum typographic drama without increasing font size. A {typography.display-md} heading at 2.5rem with weight 900 reads with the authority of a much larger size, conserving vertical space while retaining impact.

**The Ultra-Tight Display Line Height.** All display tokens share a line-height of 0.85 via {typography.lineHeight.tightest}. This deliberately tight leading creates dense, poster-like headlines where the text blocks feel monolithic rather than airy. At large sizes, the tight line height creates a cohesive mass of text that reads as a single visual shape rather than separate lines.

**The Confident Reading Weight.** Body text defaults to weight 600 for captions and button labels — a heavier-than-average UI weight that eliminates the washed-out appearance of weight 400 in small sizes. The {typography.caption} token at weight 600 ensures metadata and labels remain legible at 14px without forcing readers to squint.

**Button Line-Height Unity.** Both {typography.button-md} and {typography.button-sm} share a line-height of 1 via {typography.lineHeight.button}. This removes any vertical space between lines of multi-line button text, keeping button labels vertically centered and compact regardless of text length.

### Note on Font Substitutes

**Geist** is a relatively new typeface that may not render on all operating systems. The fallback chain places **Inter** as the first substitute — a widely available Google Font that shares Geist's geometric, contemporary character. If Inter is also unavailable, the system `sans-serif` fallback ensures legibility at the cost of brand precision.

**Inter** is loaded via Google Fonts at weights 400, 500, 600, and 900. The substitute chain `Helvetica, Arial, sans-serif` provides a gracefully degraded experience: Helvetica on macOS/iOS preserves the neutral, clean character of Inter, while Arial on Windows maintains acceptable legibility. The generic `sans-serif` catch-all ensures no environment renders text without a fallback.

**JetBrains Mono** uses the standard `monospace` keyword as its sole fallback — code formatting requires monospaced rendering above all other considerations. No specific font substitute is prescribed beyond the monospace generic.

## Layout & Spacing

### Semantic Spacing Scale

The spacing system follows a base-4 grid scale (1rem = 16px) with semantic names that describe the spacing's contextual role rather than its numerical value:

| Token | Value | rem | Typical Use |
|-------|-------|-----|-------------|
| {spacing.xxs} | 4px | 0.25rem | Micro gaps, icon-to-text spacing |
| {spacing.xs} | 8px | 0.5rem | Tight element spacing, chip padding |
| {spacing.sm} | 12px | 0.75rem | Input padding, nearby element gaps |
| {spacing.md} | 16px | 1rem | Default padding, card inner margin |
| {spacing.lg} | 24px | 1.5rem | Card padding, section internal spacing |
| {spacing.xl} | 32px | 2rem | Large component padding, modal inset |
| {spacing.xxl} | 48px | 3rem | Feature block spacing, panel gaps |
| {spacing.xxxl} | 64px | 4rem | Major section separation |
| {spacing.section} | 96px | 6rem | Between distinct page sections |
| {spacing.band} | 128px | 8rem | Maximum separation, hero-to-content gap |

### Grid

Wise uses a 12-column flexible grid system with a 16px gutter (mapped to {spacing.md}). Content containers cap at 1200px maximum width for readability, with full-bleed sections (hero banners, value bands) extending edge-to-edge on large viewports. The grid collapses to 4 columns on tablet and 2 columns on mobile, maintaining the 16px gutter throughout all breakpoints for consistency.

### Whitespace Philosophy

Whitespace in the Wise system is **generous and intentional** — not empty, but breathing. Section spacing at {spacing.section} (96px) ensures each content block stands independently, while the hero-to-content gap at {spacing.band} (128px) creates a dramatic pause between the brand statement and the functional page body. Internal component spacing at {spacing.lg} (24px) keeps card content comfortably separated without forcing the eye to jump across long gaps.

The cardinal rule: **never compress spacing to fit content.** If a layout feels too spacious, the solution is to increase content density (more concise copy, tighter type), not reduce spacing tokens.

## Elevation & Depth

### Level Table

Wise uses a **ring-shadow-only** elevation system — there are no traditional drop shadows (no `box-shadow` with blur radius as the primary depth signal). Instead, depth is communicated through thin border rings and inset outlines. This creates a flat-but-defined visual language that feels contemporary, clean, and distinctly fintech:

| Level | Treatment | Use Case |
|-------|-----------|----------|
| Level 0 | `none` | Page background, text blocks, flat surfaces |
| Level 1 | 1px outer ring {elevation.level1} | Cards, panels, default surface definition |
| Level 2 | 1px inset ring {elevation.level2} | Active input fields, pressed button states |
| Level 3 | 1px outer ring + 4px soft shadow {elevation.level3} | Dropdown menus, modals, elevated overlays |

Level 1 is the most commonly applied elevation — every card and container surface gets a subtle `1px` ring in `rgba(14, 15, 12, 0.12)` that defines its boundary without relying on background color contrast alone. This ring is barely visible on white surfaces but becomes essential for defining container edges on the `#fafafa` canvas.

Level 2 uses an inset ring (`rgb(134, 134, 133) 0px 0px 0px 1px inset`) to create the illusion of a pressed or active state. This is particularly effective for input fields — the inset ring avoids expanding the element's box model while communicating focus through interior depth.

Level 3 adds a subtle `4px 12px` soft shadow to the standard outer ring. This is the only elevation level with any blur radius, and it is **intentionally restrained** — the shadow exists to separate overlays from content, not to compete visually with the interface itself. In dark mode, the shadow darkens to `rgba(0, 0, 0, 0.4)` for adequate separation against the `#0e0f0c` background.

### Decorative Depth

Beyond the elevation level system, Wise uses **green accent glow** as a decorative depth technique. The primary color {colors.primary} applied as a semi-transparent background glow (`rgba(159, 232, 112, 0.1)` via {colors.primary} background tokens) on hero sections and interactive hover states creates atmospheric depth without adding physical layers. This green glow reads as ambient light reflecting onto the surface — a warm, organic depth that softens the otherwise precise geometric interface.

The hero gradient trio ({colors.hero-warm}, {colors.hero-glow}, {colors.hero-pink}) creates decorative depth through color blending rather than shadow layering. These three colors transition across full-bleed hero bands, generating a sense of spatial depth through warm-to-cool color progression.

## Shapes

### Border Radius Scale

The shape language is characterized by a dramatic range — from hairline-micro 2px corners to expansive 40px section rounding and infinite pill shapes. This high-contrast radius scale mirrors the typographic weight contrast: nothing is middling:

| Token | Value | Use Case |
|-------|-------|----------|
| {rounded.none} | 0 | Full-bleed sections, hero bands, sharp editorial edges |
| {rounded.xs} | 2px | Minimal corners, code blocks, inline tags, subtle definition |
| {rounded.sm} | 10px | Standard component radius — inputs, selects, textareas, progress bars |
| {rounded.md} | 16px | Alert containers, tab groups, medium-surface containers |
| {rounded.lg} | 30px | Cards, large containers, feature panels |
| {rounded.xl} | 40px | Modals, dialog boxes, section-edge rounding |
| {rounded.full} | 9999px | Pill buttons, badges, switches, radio buttons, avatars |

The 2px {rounded.xs} is the only sub-10px radius, reserved for moments that require minimal visual definition — code blocks within cards, inline tag indicators, and precision UI elements. The 10px {rounded.sm} serves as the standard component radius, applied consistently to all form controls and progress indicators for design system unity.

Cards receive {rounded.lg} (30px) — an intentionally generous radius that distinguishes Wise's card language from conventional 8-16px card rounding. Modals use {rounded.xl} (40px), stepping up the radius for overlay containers to signal they are elevated above the card layer.

The {rounded.full} (9999px) pill shape is the **signature shape of Wise's interactive elements.** Primary buttons, secondary buttons, badges, switches, radio buttons, and avatars all use the full pill radius. This creates a tactile, physical quality — interactive elements feel graspable, like coins or tokens you can hold.

### Photography Geometry

**Hero banners** use a 16:9 aspect ratio at full-bleed width, with the hero gradient trio ({colors.hero-warm}, {colors.hero-glow}, {colors.hero-pink}) as the primary visual layer. Photography within hero sections is treated as atmospheric background — positioned center, cropped to fill, with no rounded corners ({rounded.none}) to maintain edge-to-edge immersion.

**Card thumbnails** follow a 4:3 aspect ratio with {rounded.lg} (30px) corners in line with the card container. Images within cards are always full-bleed to the card edges, cropping to the 4:3 frame rather than letterboxing.

**Avatar images** are circular ({rounded.full}) and sized at 40px for standard UI (comment authors, user menus) and 80px for profile pages. Contributor and partner avatars maintain the pill shape for brand consistency with interactive elements.

## Components

### Buttons & Interaction

**Primary Button {component.button-primary}**
- Background {colors.primary} (`#9fe870`), text {colors.on-primary} (`#163300`)
- Type {typography.button-md} (Inter, 1.125rem, weight 600, line-height 1)
- Rounded {rounded.full} (9999px pill)
- Padding 16px 28px, height 52px
- Hover: Background {colors.primary} at `scale(1.05)` transform — button physically grows on hover
- Active: Background {colors.primary} at `scale(0.95)`, inset ring of {colors.on-primary}
- Focus: 2px outline using {colors.ring-focus} with 2px offset

**Secondary Button {component.button-secondary}**
- Background {colors.secondary} (`#0e0f0c`), text {colors.on-secondary} (`#ffffff`)
- Type {typography.button-md}, rounded {rounded.full}
- Padding 16px 28px, height 52px
- Hover: Background shifts to `#2a2b27` ({colors.charcoal}), with `scale(1.05)` transform
- Active: `scale(0.95)` with deep black (`#000000`) background
- Focus: Same ring-focus treatment as primary

**Ghost Button {component.button-ghost}**
- Background transparent, text {colors.ink} (`#0e0f0c`)
- Type {typography.button-md}, rounded {rounded.full}
- Padding 16px 28px, height 52px
- Hover: Background at 6% opacity of {colors.secondary}, `scale(1.05)`
- Active: `scale(0.95)` with 10% opacity secondary background

### Inputs & Selection

**Text Input {component.input}**
- Background {colors.surface} (`#ffffff`), text {colors.ink} (`#0e0f0c`)
- Type {typography.body-md} (Inter, 1rem, weight 400)
- Rounded {rounded.sm} (10px)
- Padding 12px 16px, height 48px
- Border: 1px {colors.ink} at 48% opacity via {colors.border} token
- Focus: Border at full opacity, inset ring via elevation level 2
- Placeholder: {colors.mute} (`#686868`) via {colors.placeholder}
- Error state: Border shifts to {colors.danger}

**Textarea {component.textarea}**
- Matches input styling: {colors.surface} background, {colors.ink} text, {typography.body-md}
- Rounded {rounded.sm} (10px)
- Padding 12px 16px (no fixed height — content expands)
- Same border and focus behavior as text inputs

**Select {component.select}**
- Background {colors.surface}, text {colors.ink}, type {typography.body-md}
- Rounded {rounded.sm} (10px)
- Padding 12px 16px, height 48px
- Custom chevron arrow in {colors.mute} with {colors.ink} on focus

**Checkbox {component.checkbox}**
- Rounded {rounded.sm} (10px) — squared but with noticeable rounding
- 2px border in {colors.border}
- Checked: Background fills {colors.primary} with {colors.on-primary} checkmark
- Focus: Ring-focus outline

**Radio {component.radio}**
- Rounded {rounded.full} (9999px circle)
- 2px border in {colors.border}
- Checked: Inner dot fills {colors.primary}

**Switch {component.switch}**
- Rounded {rounded.full} (9999px pill track)
- Track: 28px wide, 16px tall
- Thumb: 12px circle in white
- Active/Checked: Track fills {colors.primary}, thumb slides right

### Chips & Controls

**Badge — Success {component.badge}**
- Background {colors.badge-success} (`#054d28`), text {colors.on-dark} (`#fcfcfc`)
- Type {typography.caption} (Inter, 0.875rem, weight 600)
- Rounded {rounded.full} (9999px pill)
- Padding 4px 12px, height 24px

**Badge — Warning {component.badge-warning}**
- Background {colors.badge-warning} (`#ffd11a`), text {colors.ink} (`#0e0f0c`)
- Type {typography.caption}, rounded {rounded.full}
- Padding 4px 12px, height 24px

**Badge — Info {component.badge-info}**
- Background {colors.badge-info} (`#38c8ff`), text {colors.ink} (`#0e0f0c`)
- Type {typography.caption}, rounded {rounded.full}
- Padding 4px 12px, height 24px

**Tabs {component.tabs}**
- Background {colors.surface}, text {colors.charcoal} (`#2a2b27`)
- Type {typography.button-sm} (Inter, 1rem, weight 600)
- Rounded {rounded.md} (16px)
- Padding 8px 16px, height 40px
- Active tab: Background {colors.primary} with text {colors.on-primary}
- Tab bar: Hairline underline in {colors.hairline}

### Data & Containers

**Card {component.card}**
- Background {colors.card} (`#ffffff`), text {colors.body} (`#0e0f0c`)
- Type {typography.body-md} (Inter, 1rem, weight 400)
- Rounded {rounded.lg} (30px)
- Padding 24px (internal)
- Elevation: Level 1 — 1px outer ring via {elevation.level1}
- Hover: Level 3 elevation lift (adds 4px shadow) with no transform

**Modal {component.modal}**
- Background {colors.surface}, text {colors.ink} (`#0e0f0c`)
- Type {typography.body-md}, rounded {rounded.xl} (40px)
- Padding 32px
- Elevation: Level 3 — outer ring + soft shadow
- Overlay: {colors.overlay} at 50% opacity (light) or 60% (dark)
- Z-index: {zIndex.modal} (400)

**Avatar {component.avatar}**
- Rounded {rounded.full} (9999px circle)
- Sizes: 40px (default UI), 80px (profile)
- Border: 2px {colors.surface} for separation against backgrounds

**Progress {component.progress}**
- Background {colors.dark} (`#e8ebe6`) for track, {colors.primary} for fill
- Rounded {rounded.sm} (10px) track and fill
- Height 8px
- Fill transitions at {animation.duration.normal} (200ms)

### Feedback Components

**Alert — Success {component.alert-success}**
- Background {colors.success} (`#054d28`), text {colors.on-dark} (`#fcfcfc`)
- Type {typography.body-sm} (Inter, 0.875rem, weight 400)
- Rounded {rounded.md} (16px)
- Padding 16px
- Icon: White checkmark circle to the left of text

**Alert — Danger {component.alert-danger}**
- Background {colors.danger} (`#d03238`), text {colors.on-dark} (`#fcfcfc`)
- Type {typography.body-sm}, rounded {rounded.md} (16px)
- Padding 16px
- Icon: White exclamation circle

**Alert — Warning {component.alert-warning}**
- Background {colors.warning} (`#ffd11a`), text {colors.ink} (`#0e0f0c`)
- Type {typography.body-sm}, rounded {rounded.md} (16px)
- Padding 16px
- Icon: Dark warning triangle

### Navigation

Navigation bars use a transparent-to-surface background pattern: at page top, the navbar sits at full transparency over hero content. On scroll, it transitions to {colors.background} (`#ffffff` light / `#0e0f0c` dark) with a {colors.hairline} bottom border. Navigation links use {typography.button-sm} (Inter, 1rem, weight 600) with {colors.ink} text. Active nav items receive a {colors.primary} underline indicator. The navbar container is 64px tall with horizontal padding at {spacing.lg} (24px) on desktop, collapsing to {spacing.md} (16px) on mobile.

## Do's and Don'ts

### Do

- **Do use {colors.primary} (`#9fe870`) as the singular brand accent on CTA buttons** — confidence comes from dominance, not variety
- **Do apply pill shapes ({rounded.full}) to all primary and secondary buttons** — the pill silhouette is the signature interactive shape
- **Do use {colors.on-primary} (`#163300`) for text on green backgrounds** — dark green on lime green is the signature CTA formula
- **Do apply the `scale(1.05)` hover transform to interactive elements** — the physical growth signals responsiveness and energy
- **Do use display tokens (weight 900, line-height 0.85) for all major headings** — the extreme weight contrast defines the brand's confidence
- **Do use ring shadows ({elevation.level1}) for card definition instead of drop shadows** — the ring-shadow-only system keeps the interface flat and modern
- **Do use {spacing.section} (96px) between major page sections** — generous whitespace is a feature, not waste
- **Do use {rounded.lg} (30px) for cards** — the generous radius distinguishes Wise from conventional 8-16px card systems

### Don't

- **Don't use white text on green buttons** — always {colors.on-primary} (`#163300`) on {colors.primary} (`#9fe870`)
- **Don't apply drop shadows (blurred box-shadows) as primary depth signals** — use ring shadows; level 3 is the only exception with a subtle 4px blur
- **Don't use thin font weights (300, 400) for display headings** — display tokens are weight 900 only; anything less reads as timid
- **Don't mix multiple accent colors** — the primary green is the singular accent; secondary colors exist for semantic states only
- **Don't use sharp corners (0px to 4px) on interactive elements** — inputs get 10px, buttons get 9999px, cards get 30px; only full-bleed sections use {rounded.none}
- **Don't compress spacing to fit viewport content** — maintain {spacing.section} (96px) between sections regardless of content volume
- **Don't override the scale hover behavior** — the `scale(1.05)` transform is a system-wide interaction pattern and must be preserved

## Responsive Behavior

### Breakpoints

| Breakpoint | Width | Key Changes |
|------------|-------|-------------|
| Mobile | 0-639px | Single column layout, 16px page margin, stacked navigation, collapsed hero |
| Tablet | 640px-1023px | 4-column grid, 24px page margin, condensed hero typography |
| Desktop | 1024px-1439px | 12-column grid, 32px page margin, full display typography |
| Wide | 1440px+ | 12-column grid centered at 1200px max-width, full display-xxl typography |

### Touch Targets

All interactive elements respect a minimum 44px touch target per Apple HIG and WCAG 2.1 guidelines. The {component.button-primary} and {component.button-secondary} components at 52px height exceed this minimum. Input elements at 48px height and tab controls at 40px height all meet or exceed the 44px target. Badge components at 24px height are the exception — they are display-only labels and are not intended as primary touch targets.

On mobile viewports, any interactive element narrower than 44px (icon buttons, compact controls) gains invisible touch extension padding to reach the minimum target without visual dimension changes.

### Collapsing Strategy

**Hero sections** collapse from full display-xxl/display-xl typography on desktop to display-lg on tablet and display-md on mobile. The hero gradient maintains full-bleed width across all breakpoints but reduces height proportionally — 80vh on desktop, 60vh on tablet, 50vh on mobile.

**Card grids** shift from 3-column layouts on desktop to 2-column on tablet and single-column on mobile. Card padding remains {spacing.lg} (24px) across all viewports — internal spacing does not compress.

**Navigation** transforms from a horizontal bar on desktop (links visible, CTA button visible) to a hamburger menu on mobile. The navbar height reduces from 64px to 56px on mobile. The CTA button moves into the expanded menu.

**Form layouts** stack vertically on mobile — labels above inputs, single-column field arrangement. Desktop forms use 2-column grids for related fields (e.g., first/last name side by side).

### Image Behavior

Hero images use `object-fit: cover` at all breakpoints, cropping to fill the container rather than letterboxing. The 16:9 hero aspect ratio is maintained on desktop, but crops more aggressively on mobile (16:7) to prioritize the focal center. Card thumbnails at 4:3 maintain their aspect ratio down to 280px minimum width, below which they crop to 1:1 square. Avatar images remain circular at all breakpoints, scaling proportionally without cropping changes. No image uses `srcset` density descriptors below 1x — all asset generation targets 2x resolution for Retina/HiDPI displays as the minimum baseline.

## Iteration Guide

1. **Start with the primary accent.** If you need to adapt the Wise design system for a new context (sub-brand, campaign, regional variant), define the primary accent color first. Every other decision — surface hierarchy, text contrast, component styling — follows from this choice. Keep the accent singular: one color for all CTAs, selections, and interactive states.

2. **Reference tokens directly in implementation.** Never hardcode hex values or pixel dimensions. Use `{colors.primary}`, `{rounded.lg}`, `{spacing.section}` in CSS custom properties and design files. This ensures a single source of truth and makes global changes possible through token updates alone.

3. **Maintain the ring-shadow-only elevation rule.** When adding a new elevated component, start with no shadow ({elevation.level0}) and introduce definition through the 1px outer ring ({elevation.level1}) before considering the level 3 shadow. The system is designed to avoid blur-based depth; preserve this constraint.

4. **Test all components in both light and dark mode.** The dark palette inverts surface and foreground colors but preserves primary and semantic colors. Ensure contrast ratios meet WCAG AA standards (4.5:1 for body text, 3:1 for large text) in both modes.

5. **Use the extreme weight contrast on every new heading style.** Any new typography token should follow the display/body dichotomy: display tokens at weight 900 with line-height 0.85, body tokens at weight 400 with line-height 1.44. The contrast is the system — don't introduce intermediate weights for headings.

6. **Apply `scale(1.05)` consistently to all interactive hover states.** Buttons, cards that link to content, clickable list items — any element with a `cursor: pointer` should grow 5% on hover. The `scale(0.95)` active state signals the press. Keep the transform origin centered.

7. **Validate pill-button shapes.** All primary and secondary buttons must use {rounded.full} (9999px). If a button layout appears too wide or too narrow, adjust the horizontal padding (minimum 28px), never the border-radius. The pill silhouette is non-negotiable.

8. **Respect the semantic spacing scale.** Use the correct spacing token for each context — {spacing.sm} for input padding, {spacing.lg} for card padding, {spacing.section} for page sections. The token name encodes the usage intent; choosing by numerical value defeats the purpose of semantic naming.

## Known Gaps

- **Tooltip component** — Not yet extracted as a standalone token-defined component. Tooltips currently use generic overlay styling without dedicated shape or animation tokens. Document as part of feedback components in a future iteration.
- **Dropdown menu** — The select dropdown and contextual menu patterns share behavioral similarities but have not been unified under a single component token. Future work should define a `{component.dropdown}` with consistent ring-shadow elevation, pill anchor, and animation.
- **Table/Data grid** — Table components (transaction history, rate tables, transfer logs) use ad-hoc styling. A dedicated data grid component with striped rows, sort controls, and responsive collapse behavior has not been tokenized.
- **Skeleton/loading states** — Loading placeholders use hardcoded dimensions and animation timing rather than system tokens. A `skeleton` shape and pulse animation token should be added to the animation and shape systems.
- **Footer component** — The page footer uses {colors.deep} background and condensed typography but has not been formalized as a `{component.footer}` token entry with defined padding and internal layout rules.
- **Accordion/Collapsible** — Expandable content sections exist in the product but lack dedicated shape, animation, and spacing tokens. The chevron rotation animation should reference {animation.duration.fast}.
- **Breadcrumb navigation** — Breadcrumb trails use inline text styling without token reference. A `{component.breadcrumb}` should define separator color, active page weight, and hover behavior.
- **Pagination** — Page number controls for transaction history and search results are not tokenized. Button-like pill shapes for page numbers should reference {rounded.full} and {typography.button-sm}.
- **Mobile-specific component variants** — Responsive behavior is implemented at the layout level but individual component tokens (e.g., `button-primary-mobile` with reduced padding) have not been defined in the token specification.
