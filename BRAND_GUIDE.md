# Brand Guide

## Status

This guide is the current visual baseline for the project website. It was
provided by the project owner on 2026-07-20 and supersedes earlier color
guidance in this repository.

The website must remain factual about product maturity. Illustrations are
conceptual unless a page explicitly links to verified materials.

## Typography

- Primary interface typeface: `TT Norms Pro`.
- Local `TT Norms Pro` webfonts are bundled in `static/fonts/` in weights
  400, 500, 700, 800, and 900. The package was provided by the project owner
  on 2026-07-20.
- Fallback stack: `TT Norms`, `Inter`, `Arial`, `sans-serif`.
- Accent typeface: `Tochka Script`.
- Use `Tochka Script` only for short, non-essential accents such as the
  pilot tag. Do not use it for navigation, paragraphs, long headings, or
  mandatory grant attribution.
- Do not self-host or download commercial font files without a licensed
  webfont package supplied by the project owner.

## Interaction

- On desktop, the homepage is structured as full-viewport stages with
  scroll snapping. Each stage must fit within one viewport without clipping
  essential content.
- The fixed left route is the primary page navigation. Its robot marker moves
  continuously with page progress; the active route point uses the orange
  scan treatment.
- Keep the route visual compact and label-free. Accessible names belong in
  `aria-label` attributes, not visible copy.
- Do not add a desktop header or a language switcher above the first section.
  The language switch remains in the footer.

## Palette

| Token | Hex | Role |
| --- | --- | --- |
| Purple 7 | `#7F42E1` | Primary action and strong brand background |
| Purple 6 | `#915DE6` | Hover and secondary strong background |
| Purple 5 | `#A57BEC` | Secondary accent |
| Purple 4 | `#BA9AF1` | Soft strong surface |
| Purple 3 | `#D0BAF7` | Borders and soft contrast |
| Purple 2 | `#E7DBFD` | Soft surface |
| Purple 1 | `#F5F0FF` | Page canvas |
| Amaranth Light | `#F6D1E9` | Warm supporting surface |
| Teal Light | `#CDECF1` | Cool supporting surface |
| Orange Light | `#F9DED6` | Warm supporting surface |
| Black | `#191919` | Text and dark background |
| White | `#FFFFFF` | Surface and reversed text |

## UI Rules

- Use Purple 7 for primary actions and focus states. Keep Black for durable
  high-contrast text.
- Pair light purple, teal, orange, and amaranth surfaces with Black text.
- Keep cards and controls at `8px` radius or less.
- Do not add gradients, glow, glassmorphism, decorative orbs, or visual
  elements that imply unverified product capabilities.
- Use the robot illustration as a project mark only when its conceptual
  status remains clear in nearby product imagery.
