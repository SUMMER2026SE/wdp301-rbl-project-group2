---
type: pattern
status: active
severity: high
tags: [ai-provider, gemini, groq, privacy, zod]
applies_to: [backend]
created: 2026-05-26
updated: 2026-05-26
---

# Pattern: AI provider safe boundary

## Use when

Any task touches Gemini, Groq, chatbot, AI-generated content, prompt construction, structured AI output, or customer support automation.

## Rules

- Do not send secrets, JWTs, payment data, raw webhook data, or unnecessary PII to AI providers.
- Treat AI output as untrusted.
- Validate structured AI output with Zod before using it.
- AI must not decide roles, permissions, payment status, order status, inventory, or irreversible actions.
- Add timeouts/fallbacks for provider calls where appropriate.
