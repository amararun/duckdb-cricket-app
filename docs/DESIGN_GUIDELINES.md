# DuckDB Dashboards - Design Guidelines

Design system based on Yahoo Finance aesthetic: professional, readable, clean, business-like.

## Core Principles

1. **Pure white backgrounds** - No warm grays, no shaded sections
2. **Dark readable text** - High contrast, no tiny light gray text
3. **Generous spacing** - Everything breathes
4. **Color used sparingly** - Only for meaning (links, positive/negative values)
5. **Large readable fonts** - No tiny text, adequate font weights
6. **Simple borders** - Thin 1px lines where needed, not everywhere
7. **No AI patterns** - No gradients, no colored card backgrounds, no accent bars

## Color Palette

| Usage | Color | Tailwind Class |
|-------|-------|----------------|
| Background | Pure white | `bg-white` |
| Primary text | Near-black | `text-gray-900` |
| Secondary text | Dark gray | `text-gray-600` |
| Tertiary/labels | Medium gray | `text-gray-500` |
| Borders | Light gray | `border-gray-200` |
| Links/Actions | Blue | `text-blue-600` |
| Positive values | Green | `text-green-600` |
| Negative values | Red | `text-red-600` |
| Hover background | Very light | `hover:bg-gray-50` |

### Accent Colors (Use Sparingly)
- **Red/Coral** - Header branding only (`text-red-500`)
- **Blue** - Links and interactive elements
- **Green** - Positive values, success states
- **Teal** - Chart elements, occasional accent

## Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| App title | Plus Jakarta Sans | 20-24px | Bold | `text-gray-900` |
| Page headings | Nunito Sans | 20-24px | Bold | `text-gray-900` |
| Section headings | Nunito Sans | 18px | Semibold | `text-gray-900` |
| Card titles | Nunito Sans | 16-18px | Semibold | `text-gray-900` |
| Body text | Nunito Sans | 15-16px | Regular | `text-gray-700` |
| Table headers | Nunito Sans | 14px | Semibold | `text-gray-600` |
| Table data | Nunito Sans | 14-15px | Regular | `text-gray-900` |
| Labels/captions | Nunito Sans | 13-14px | Regular | `text-gray-500` |
| Large numbers | Nunito Sans | 28-32px | Bold | `text-gray-900` |

## Component Patterns

### Cards (Landing Page, Info Cards)

```
Design:
- White background (bg-white)
- Thin border (border border-gray-200)
- No rounded corners or subtle (rounded-sm)
- No shadows or very subtle (shadow-sm)
- No colored backgrounds

Spacing:
- Padding: p-6 (24px)
- Gap between cards: gap-6

Typography:
- Title: text-lg font-semibold text-gray-900
- Description: text-base text-gray-600
- Links: text-blue-600 hover:text-blue-700
```

### Stat Cards (Dashboard)

```
Design:
- White background
- Optional thin border
- Large number as hero element

Layout:
- Number on top, large and bold
- Label below, smaller gray text

Example:
  8,762          ← text-3xl font-bold text-gray-900
  Total Matches  ← text-sm text-gray-500
```

### Data Tables

```
Design:
- White background
- Header row with bottom border
- Light alternating rows optional (bg-gray-50)
- Row hover: hover:bg-gray-50

Typography:
- Headers: text-sm font-semibold text-gray-600 uppercase tracking-wide
- Data: text-sm text-gray-900
- Numbers: text-right, tabular-nums

Colors for values:
- Positive: text-green-600
- Negative: text-red-600
- Links: text-blue-600
```

### Navigation/Tabs

```
Design:
- Text-based, no heavy boxes
- Active: font-medium with underline or darker color
- Inactive: text-gray-500

Example:
  Summary  News  Chart  Statistics
  ───────
  (active has underline)
```

### Buttons

```
Primary (rare):
- bg-blue-600 text-white hover:bg-blue-700
- Use sparingly

Secondary/Default:
- bg-white border border-gray-300 text-gray-700
- hover:bg-gray-50

Text buttons:
- text-blue-600 hover:text-blue-700
- No background
```

### Filter Controls

```
Select dropdowns:
- bg-white border border-gray-300 rounded
- text-gray-900
- Focus: ring-2 ring-blue-500

Pills/Tags:
- bg-gray-100 text-gray-700
- Active: bg-blue-100 text-blue-700
```

## What to AVOID

| Pattern | Why |
|---------|-----|
| Colored card backgrounds (bg-indigo-50, bg-emerald-50) | Looks like AI/toy shop |
| Warm grays (stone, warm-gray) | Looks dead/fuzzy |
| Gradients | Screams AI-generated |
| Heavy shadows (shadow-lg, shadow-xl) | Unnecessary weight |
| Tiny light gray text (text-xs text-gray-400) | Unreadable |
| Large rounded corners (rounded-xl) | Too playful |
| Accent bars/strips on cards | AI pattern |
| Multiple bright colors together | Toy shop |
| Colored icons everywhere | Keep icons gray/black |
| Light gray backgrounds (bg-gray-50 for main) | Use pure white |

## Spacing Guidelines

| Context | Value |
|---------|-------|
| Page padding | p-6 (24px) |
| Card padding | p-6 (24px) |
| Section gaps | gap-6 or gap-8 |
| Between related items | gap-4 |
| Table row height | py-3 (12px vertical) |
| Inline spacing | gap-2 or gap-3 |

## Responsive Behavior

- Cards stack on mobile (grid-cols-1 md:grid-cols-2)
- Tables scroll horizontally on mobile (overflow-x-auto)
- Font sizes stay readable (don't shrink too much)
- Adequate touch targets (min 44px)

## Implementation Notes

- Use Tailwind's default gray scale (not slate, stone, zinc)
- Font: Nunito Sans loaded via Google Fonts
- App header title: Plus Jakarta Sans
- Icons: Lucide React, kept simple and dark (text-gray-500 or text-gray-900)
