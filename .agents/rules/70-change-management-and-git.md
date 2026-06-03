# Change Management and Git Hygiene

AI-generated changes must be easy for humans to review and roll back.

## Atomic change loop

Use this loop for implementation:

1. Inspect existing pattern.
2. Make one small coherent change.
3. Run the cheapest relevant verification.
4. Review the diff.
5. Continue only if the previous slice is clean.

Avoid editing many unrelated files in one pass.

## No surprise rewrites

Do not rewrite a module, rename folders, reformat whole files, or change public API contracts unless the task explicitly asks for it.

Do not mix unrelated work, for example:

- feature + dependency upgrade
- bug fix + broad refactor
- payment change + UI redesign
- deploy script change + database migration

## Commit / patch discipline

When asked to create a commit message, use Conventional Commit style:

```txt
<type>(optional-scope): <imperative summary>
```

Allowed types:

```txt
feat, fix, docs, style, refactor, perf, test, chore, build, ci, revert
```

For high-risk code, include a short body with:

- why the change was needed
- verification performed
- rollback note if relevant

## Diff review before final

Before final response, inspect the changed diff and check for:

- accidental secret exposure
- debug logs
- broad formatting noise
- unhandled error paths
- missing validation
- broken imports/types
- frontend cache invalidation issues
- backend authorization gaps
