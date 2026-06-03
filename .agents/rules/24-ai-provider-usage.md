# AI Provider Usage Rules

Backend has Gemini and Groq SDKs:

- `@google/generative-ai`
- `groq-sdk`

AI provider output is untrusted.

## Do not send sensitive data to AI providers

Never send:

- passwords or password hashes
- JWTs, cookies, refresh tokens
- PayOS secrets or payment signatures
- private API keys
- full customer PII when not necessary
- database dumps
- SSH keys or env files

## Validate outputs

- Use Zod to validate structured AI output.
- Handle malformed JSON and hallucinated fields.
- Add timeout/retry limits where appropriate.
- Provide safe fallback behavior.

## Do not use AI output as authority

AI must not directly decide or modify:

- order payment status
- order total or discount
- inventory
- user roles/permissions
- fraud/security decisions without human/system validation
