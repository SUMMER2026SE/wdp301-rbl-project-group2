# Cloudinary + Multer Upload Rules

Backend uses `multer`, `cloudinary`, and `mime-types`.

Uploads are a security boundary.

## Validation

- Enforce file size limits.
- Enforce MIME type allowlist.
- Do not trust file extension alone.
- Reject unsupported media types with clear errors.
- Sanitize file names if they are stored or reused.

## Cloudinary

- Keep Cloudinary credentials server-side only.
- Store `public_id` so images can be replaced/deleted later.
- Prefer `secure_url` for stored image URLs.
- Use folder naming conventions if already present.
- Delete old Cloudinary assets when replacing images if existing business logic expects cleanup.

## Temporary files

If disk storage is used:

- Remove temporary files after upload success.
- Remove temporary files after upload failure.
- Do not leave user-uploaded files in repo folders.

## Authorization

Before allowing uploads or deletions:

- Verify user is authenticated.
- Verify user has permission to modify that product/store/profile/resource.
