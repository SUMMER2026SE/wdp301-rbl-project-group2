---
type: lesson
status: active
severity: medium
tags: [referral, membership, points, frontend, legacy-data]
applies_to: [backend, frontend]
created: 2026-06-22
updated: 2026-06-22
source: bugfix
promote_if_repeated: true
---

# Lesson: Referral UI must complete both invite and claim flows

## Trigger

/profile/wallet rendered referral share buttons, but they had no handlers. The backend claim endpoint existed without any frontend caller, and legacy users could lack a real referralCode.

## Root cause

The feature was implemented as disconnected UI and API pieces. Referral codes were generated only by the new-user pre-save path, while the frontend silently substituted the invalid placeholder FOODIE for missing codes. Legacy users may also store role as uppercase `CUSTOMER`, while newer code uses lowercase `customer`; referral lookup must support both until role data is normalized.

## Correct pattern next time

Test referral end to end with two accounts: obtain a persisted code, copy/share it, claim it once, reject self/duplicate claims, refresh rewards and history, and cover records created before the feature existed. Never display a placeholder as a usable referral code. Any role-scoped lookup must account for both legacy uppercase and canonical lowercase role values.

## Evidence / verification

Backend and frontend builds pass. Frontend lint has no errors. Backend Jest currently contains no tests, so manual two-account API/UI verification remains necessary.

## Should this be promoted?

- [x] Keep as lesson
- [ ] Promote to `.agents/rules`
- [ ] Promote to `.agents/skills`
- [ ] Promote to `.agents/workflows`
- [ ] Promote to `.agents/references`

Reason: Medium-severity feature completeness lesson; promote only if this disconnected-flow pattern repeats.
