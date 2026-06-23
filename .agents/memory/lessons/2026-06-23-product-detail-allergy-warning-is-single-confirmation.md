---
type: lesson
status: active
severity: medium
tags: [allergy, cart, product-detail, frontend, ux]
applies_to: [frontend]
created: 2026-06-23
updated: 2026-06-23
source: bugfix
promote_if_repeated: true
---

# Lesson: Product detail allergy disclosure is a single confirmation point

## Trigger

The product detail page showed a full allergy notice, then opened the global allergy warning modal again when the customer added the same product to the cart. It also displayed the positive NutriAI recommendation beside a known allergy conflict.

## Root cause

The detail page reused `safeAddItem`, which is designed for compact cards that do not show full allergy details. The positive health badge only checked for health tags and ignored the resolved allergy-risk level.

## Correct pattern next time

Treat the detailed allergy panel as the disclosure point for product-detail actions: add directly to the cart from that page after the customer has had the chance to read the panel. Keep `safeAddItem` on menu, home, campaign, and other compact product surfaces. Render positive personalized recommendations only when the resolved risk level is `safe`.

## Evidence / verification

Frontend lint has no errors and frontend/backend builds pass. Manual QA should cover a danger product on detail and the same product on a menu card to confirm only the card opens the warning modal.

## Should this be promoted?

- [x] Keep as lesson
- [ ] Promote to `.agents/rules`
- [ ] Promote to `.agents/skills`
- [ ] Promote to `.agents/workflows`
- [ ] Promote to `.agents/references`

Reason: Medium-severity UX and safety consistency lesson; promote only if warning behavior regresses or spreads to more product surfaces.
