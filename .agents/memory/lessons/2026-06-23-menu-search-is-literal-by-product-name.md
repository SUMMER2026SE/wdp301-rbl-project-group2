---
type: lesson
status: active
severity: medium
tags: [search, menu, product, mongodb, ux]
applies_to: [backend, frontend]
created: 2026-06-23
updated: 2026-06-23
source: human-correction
promote_if_repeated: true
---

# Lesson: Menu search is literal by product name

## Trigger

Menu search expanded user input through Vietnamese synonyms, category intent, token matching, and in-memory relevance ranking. This returned related dishes that the customer did not actually search for.

## Root cause

The product list endpoint treated search as recommendation-style discovery instead of a direct product-name filter.

## Correct pattern next time

For `/api/products?search=...`, trim and regex-escape the complete input, then perform a case-insensitive substring match only against `name`. Do not expand synonyms, split tokens, search unrelated fields, or substitute recommendations. Preserve normal sorting and pagination. When there is no match, return an empty result and let the menu show the searched term in its empty state.

## Evidence / verification

Backend and frontend builds pass. Backend Jest has no tests. Frontend lint has no errors; existing warnings remain.

## Should this be promoted?

- [x] Keep as lesson
- [ ] Promote to `.agents/rules`
- [ ] Promote to `.agents/skills`
- [ ] Promote to `.agents/workflows`
- [ ] Promote to `.agents/references`

Reason: Product-specific search behavior; promote if smart-search behavior is reintroduced or the rule is needed by other searchable modules.
