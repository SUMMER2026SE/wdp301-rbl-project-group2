# FOA Agent Memory

This folder is the project-level long-term memory for Antigravity agents.

It does **not** rely on the model remembering previous chats. It stores team knowledge as small Markdown cards that live in git, can be reviewed in PRs, and can be retrieved by future agents.

## Core loop

```txt
Retrieve relevant memory before task
→ implement / review / debug
→ capture new lesson if something was learned
→ update MEMORY_INDEX.md
→ promote repeated/high-risk lessons into rules, workflows, or skills
```

## Folders

```txt
MEMORY_INDEX.md       Fast routing menu for agents
lessons/              Small lessons learned from bugs, reviews, failed attempts
incidents/            Postmortems for production/staging/high-severity issues
patterns/             Approved implementation patterns and reusable recipes
decisions/            Architecture decision records and conventions
module-index/         Maps of important backend/frontend modules and flows
anti-patterns.md      Things agents must avoid repeating
glossary.md           Project terms, statuses, domain concepts
```

## When to write memory

Write memory when you see:

- A bug that could happen again.
- A repeated code review comment.
- A PayOS/order/payment/auth/upload/socket/VPS pitfall.
- A project-specific convention that was not obvious from code.
- A failed agent attempt and the corrected approach.
- A new invariant or rule from the human team.

## When not to write memory

Do not store:

- Secrets or `.env` values.
- Customer private data.
- Raw payment signatures or tokens.
- One-off notes with no future value.
- Long transcripts of chats.

Prefer short, high-signal cards.
