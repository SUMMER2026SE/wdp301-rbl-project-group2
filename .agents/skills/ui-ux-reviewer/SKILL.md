---
name: ui-ux-reviewer
description: Use this skill when reviewing or improving UI/UX of React admin/customer pages in fe-foa - layout, hierarchy, forms, modals, tables, empty/loading/error states, accessibility, and responsiveness. Pairs with react-food-ui for implementation conventions.
---

# Skill: ui-ux-reviewer

Project-specific UI/UX review checklist for `fe-foa` (Tailwind 4.x + MUI 7.x + lucide-react).
Distilled from public Claude Code UI/UX skills (ux-designer-skill, ui-ux-pro-max) and adapted to
this repo's existing design language. Use alongside `react-food-ui` (which covers data-fetching,
forms, and architecture conventions) - this skill focuses on visual/interaction quality.

## This repo's design tokens

Reuse these instead of inventing new colors/spacing:

- Text/heading: `#1b140d`
- Muted/secondary text: `#9a734c`
- Borders/dividers: `#e7dbcf`
- Page/section background: `#fcfaf8`, `#f3ede7`
- Primary accent: `orange-600` / `#ee8c2b` / `#d87c24` (hover states)
- Status colors: emerald (success/active), amber (pending), rose (error/destructive)
- Rounded corners: `rounded-xl` / `rounded-2xl` / `rounded-3xl` for cards, modals, inputs
- Icons: `lucide-react` only (no emoji-as-icon)
- Custom scrollbars: `custom-scrollbar` utility class for overflow areas

## Procedure

1. Read the target page/component fully before changing anything; note existing patterns
   (admin tables, modals, stat cards) in sibling pages (`Vouchers`, `MenuManagement`, `Orders`)
   so the change stays visually consistent with the rest of the admin area.
2. Identify the user's actual pain point (cluttered form, unclear status, hard-to-scan table,
   missing feedback) before redesigning - don't restyle things that already work.
3. Apply the checklist below, prioritizing accessibility and clarity over decoration.
4. Keep changes scoped to the page/component requested; don't refactor shared layout
   components unless the issue is systemic.
5. Run `pnpm lint` and `pnpm build` from `frontend/` after changes.

## Checklist

### Layout & hierarchy
- One clear primary action per view (e.g., "Tạo chiến dịch"); secondary actions visually de-emphasized.
- Group related fields/sections visually (cards, dividers, spacing) - avoid walls of inputs.
- Stat cards / summaries above tables only when they add scannable value, not decoration.
- Consistent spacing rhythm (Tailwind 4/8px scale: `gap-2`, `gap-4`, `p-4`, `p-6`).

### Tables & lists
- Loading, empty, and error states are distinct and informative (not just blank/spinner forever).
- Long text (names, emails) truncates or wraps gracefully; actions column doesn't collapse.
- Status uses both color AND text/icon (never color alone).
- Row actions have `title`/`aria-label` tooltips when icon-only.

### Forms & modals
- Inline validation messages near the field, in Vietnamese, matching existing toast tone.
- Required vs optional fields are visually distinguishable.
- Submit button reflects async state (disabled/loading) during mutation - prevent double-submit.
- Modal: scrollable body with sticky header/footer for long forms (`max-h-[90vh]`, `overflow-y-auto`).
- Closing a modal with unsaved changes should be intentional (confirm or at least not silently lose work) for non-trivial forms.
- Numeric inputs (price, discount, %) constrain range/step and show units inline.

### Feedback & states
- Every async action (create/update/delete/approve/reject) gives toast feedback - success and error.
- Destructive actions (delete) require confirmation.
- Buttons show pressed/hover/disabled states consistent with `active:scale-[0.98]` pattern used elsewhere.

### Accessibility
- Color contrast: body text ~4.5:1, secondary text ~3:1 against background.
- Touch targets ≥ ~40px for icon buttons (`p-2` with `w-4/5 h-4/5` icon is the repo norm).
- Keyboard: modals closeable via Escape where feasible, focus doesn't get trapped/lost.
- Respect `prefers-reduced-motion` for any new animation (avoid large new transition libs).

### Responsiveness
- Verify at mobile width: forms stack to `grid-cols-1`, tables get `overflow-x-auto`, modals stay within viewport.
- No fixed pixel widths that break on small screens; prefer `max-w-*`, `w-full`, `flex-wrap`.

## Anti-patterns to avoid

- New color palette or font outside the existing token set.
- Emoji used as functional icons.
- New animation/UI libraries beyond what's already in `package.json`.
- Disabling a button without explaining why (use tooltip/helper text).
- Pre-checked checkboxes for opt-in choices (e.g., notification preferences).
