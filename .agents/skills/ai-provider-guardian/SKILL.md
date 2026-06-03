---
name: ai-provider-guardian
description: Use this skill when adding, reviewing, or refactoring Gemini or Groq AI provider integrations in the backend; it prevents leaking secrets or payment/customer data and requires validating structured AI output.
---

# Skill: ai-provider-guardian

Use this skill when adding or reviewing Gemini/Groq integration.

## Procedure

1. Identify exactly what user/system data is sent to provider.
2. Remove secrets and unnecessary PII.
3. Add timeout/error handling.
4. Validate structured output with Zod.
5. Treat provider output as suggestion/untrusted data.
6. Add safe fallback.
7. Log only minimal metadata.

## Guardrails

AI output must not directly modify:

- payment status
- order total
- inventory
- user role
- permissions
- security decisions
