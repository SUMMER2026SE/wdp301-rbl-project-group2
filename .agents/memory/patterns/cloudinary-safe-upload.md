---
type: pattern
status: active
severity: high
tags: [cloudinary, multer, upload, image, security]
applies_to: [backend, frontend]
created: 2026-05-26
updated: 2026-05-26
---

# Pattern: Safe Cloudinary/Multer uploads

## Use when

Any task touches product images, avatar, banners, uploads, media deletion/replacement, Cloudinary, or Multer.

## Backend pattern

- Enforce file size limits.
- Validate MIME type, not just extension.
- Keep Cloudinary secrets server-side only.
- Store `public_id` and URL metadata needed for replace/delete.
- Cleanup local temp files if disk storage is used.
- Authorize upload/delete operations by role/ownership.

## Frontend pattern

- Validate client-side for UX, but backend validation is mandatory.
- Do not expose Cloudinary API secrets in Vite env.
