# Workflow: learn-from-session

Goal: update the agent kit when a useful project-specific lesson appears.

Use when the team says things like:

- "lần sau nhớ..."
- "repo này luôn dùng pattern..."
- "đừng làm kiểu đó nữa"
- "task này hay gặp, tạo workflow đi"

## Steps

1. Restate the lesson in one sentence.
2. Decide storage location:
   - rule
   - workflow
   - skill
   - reference checklist
3. Check for duplicates in `.agents`.
4. Update the smallest relevant file.
5. If creating/updating a skill, ensure frontmatter has `name` and strong `description`.
6. Run `agent-kit-audit` if possible.
7. Report exactly what changed.

## Do not capture

- secrets
- raw customer data
- private payment payloads
- one-off opinions with no future value
