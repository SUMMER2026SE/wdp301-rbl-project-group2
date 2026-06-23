---
name: cloudinary-upload-guardian
description: Use this skill when adding or reviewing image upload, media deletion, Cloudinary, Multer, MIME validation, file size limits, or product/avatar/banner image management.
---

# Skill: cloudinary-upload-guardian

Use this skill when adding/reviewing uploads or media management.

## Procedure

1. Inspect multer configuration.
2. Inspect Cloudinary config/wrapper.
3. Confirm auth/role/ownership before upload/delete.
4. Enforce file size limit.
5. Enforce MIME allowlist.
6. Upload to Cloudinary server-side.
7. Store `public_id` and `secure_url`.
8. Clean temporary files.
9. Delete/replace old asset if business logic requires.

## Guardrails

- Never expose Cloudinary secrets client-side.
- Do not trust file extension only.
- Do not store uploaded files in source repo.
- Do not allow arbitrary remote URL upload without validation.
