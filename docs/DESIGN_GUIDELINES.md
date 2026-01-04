# DuckDB Dashboards - Design Guidelines

Clean, professional design. Sharp text, white backgrounds, no light gray text.

## Golden Rule

**ALL text must be sharp and readable.** Use `text-gray-900` with `font-medium` or `font-semibold` for everything. Never use light shades like `text-gray-400`, `text-gray-500`, or `text-gray-600` for any text the user needs to read.

## Colors (Keep It Simple)

| Usage | Tailwind Class |
|-------|----------------|
| Background | `bg-white` |
| ALL text | `text-gray-900` |
| Borders | `border-gray-200` |
| Active nav item | `text-blue-600 bg-blue-50` |
| Positive/Results | `text-green-700 font-semibold` |
| Hover | `hover:bg-gray-50` |

**Exception:** Only use `text-gray-600` for tiny footnotes or captions that are truly supplementary.

## Typography

ALL text uses `font-medium` minimum. Never `font-normal` or `font-light`.

| Element | Classes |
|---------|---------|
| Page title | `text-2xl font-bold text-gray-900` |
| Page subtitle | `text-base font-medium text-gray-900` |
| Section title | `text-lg font-semibold text-gray-900` |
| Card labels | `text-sm font-medium text-gray-900` |
| Table headers | `text-sm font-semibold text-gray-900 uppercase tracking-wide` |
| Table data | `text-sm font-medium text-gray-900` |
| Large numbers | `text-3xl font-bold text-gray-900 tabular-nums` |
| Results/wins | `text-sm font-semibold text-green-700` |
| Footnotes only | `text-xs text-gray-600` |

## Header Navigation

White background, all text sharp.

```
Header container: bg-white border-b border-gray-200
Section title:    text-xl font-bold text-gray-900
Nav items:        text-base font-medium text-gray-900
Active nav:       text-blue-600 bg-blue-50
Icons:            h-6 w-6 (header) or h-5 w-5 (nav items)
```

## Stat Cards

```tsx
<div className="bg-white border border-gray-200 p-5">
  <p className="text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
  <p className="text-sm font-medium text-gray-900 mt-1">{label}</p>
</div>
```

## Data Tables

```tsx
// Header
<th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">

// Data cell
<td className="px-4 py-3 text-sm font-medium text-gray-900">

// Result/positive value
<td className="px-4 py-3 text-sm font-semibold text-green-700">
```

## Filter Buttons (Segmented)

```tsx
<div className="flex border border-gray-200">
  <button className={`px-4 py-1.5 text-sm font-medium ${
    active ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-50'
  }`}>
```

## Bar Charts

Colors for stacked bars:
- `bg-gray-700` (Test/primary)
- `bg-blue-500` (ODI/secondary)
- `bg-teal-500` (T20/tertiary)

Legend text: `text-sm font-medium text-gray-900`

## What NOT to Do

| Never | Why |
|-------|-----|
| `text-gray-400`, `text-gray-500` | Too light, hard to read |
| `font-normal`, `font-light` | Text looks washed out |
| `text-sm` without `font-medium` | Appears thin and light |
| Colored backgrounds on cards | AI slop aesthetic |
| Gradients anywhere | Screams AI-generated |
| `text-xs` for data | Too small |
| Different grays (slate, stone) | Stick to `gray` |

## Quick Reference

When in doubt:
- Text color: `text-gray-900`
- Font weight: `font-medium` (data) or `font-semibold` (headers)
- Background: `bg-white`
- Border: `border border-gray-200`
- Hover: `hover:bg-gray-50`

## Font Stack

- Primary: Nunito Sans (body text)
- Headings: Plus Jakarta Sans (app title only)
- Icons: Lucide React, `text-gray-900`
