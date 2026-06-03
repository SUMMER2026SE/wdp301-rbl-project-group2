# Module Index: Backend Upload Flow

## Entry Points
- Routes: [file.route.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/routes/file.route.ts)
- Controllers: [file.controller.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/controllers/file.controller.ts)

## Important Files
- Config: [multer.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/config/multer.ts)
- Services: [file.service.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/services/file.service.ts)
- Utils: [upload-file.ts](file:///Users/nguyenanh/Documents/SUBJECTS/SDN302/food_order_app/chain-restaurant-platform/backend/src/utils/upload-file.ts)

## Invariants
- Image uploads are restricted by authentication and user roles (`ADMIN`, `STAFF`, `CUSTOMER`).
- Temporary files must be cleaned up properly.
- Validate file MIME types and size limit on the server.

## Related Skills/Rules
- `cloudinary-upload-guardian`
- `23-cloudinary-upload.md`

## Tests / Check Commands
- Backend build: `pnpm build`
