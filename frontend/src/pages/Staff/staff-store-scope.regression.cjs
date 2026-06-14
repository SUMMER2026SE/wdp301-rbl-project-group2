const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../..');

const appSource = fs.readFileSync(path.join(root, 'frontend/src/App.tsx'), 'utf8');
const useAuthSource = fs.readFileSync(path.join(root, 'frontend/src/hooks/useAuth.ts'), 'utf8');
const guardPath = path.join(root, 'frontend/src/components/guards/RequireStaffStore.tsx');
const guardSource = fs.existsSync(guardPath) ? fs.readFileSync(guardPath, 'utf8') : '';
const noStorePath = path.join(root, 'frontend/src/pages/Staff/NoStore/index.tsx');
const noStoreSource = fs.existsSync(noStorePath) ? fs.readFileSync(noStorePath, 'utf8') : '';

assert.match(useAuthSource, /storeId\s*=\s*user\?\.storeId/, 'useAuth must expose storeId from auth user');
assert.match(useAuthSource, /hasAssignedStore/, 'useAuth must expose hasAssignedStore helper');
assert.match(guardSource, /Navigate to="\/staff\/no-store"/, 'RequireStaffStore must redirect missing store to /staff/no-store');
assert.match(noStoreSource, /chưa được gán chi nhánh/i, 'Staff no-store page must explain missing store assignment');
assert.match(appSource, /RequireStaffStore/, 'App must use Staff store guard');
assert.match(appSource, /path="\/staff\/no-store"/, 'App must route /staff/no-store');
assert.match(appSource, /RequireRole allowedRoles=\{\["STAFF"\]\}/, 'Staff routes must require only STAFF role');
assert.doesNotMatch(appSource, /RequireRole allowedRoles=\{\["STAFF", "ADMIN"\]\}/, 'Staff routes must not allow ADMIN as Staff fallback');

const orderServiceSource = fs.readFileSync(path.join(root, 'frontend/src/services/order.service.ts'), 'utf8');
assert.match(orderServiceSource, /interface StaffStoreScope/, 'order service must define StaffStoreScope');
assert.match(orderServiceSource, /getStaffOrders\(/, 'order service must expose getStaffOrders');
assert.match(orderServiceSource, /getStaffOrderById\(/, 'order service must expose getStaffOrderById');
assert.match(orderServiceSource, /staffConfirmOrder\(/, 'order service must expose staffConfirmOrder');
assert.match(orderServiceSource, /staffMarkOrderReady\(/, 'order service must expose staffMarkOrderReady');
assert.match(orderServiceSource, /staffAssignDelivery\(/, 'order service must expose staffAssignDelivery');
assert.match(orderServiceSource, /\/orders\/staff\/orders/, 'Staff order methods must call /orders/staff/orders endpoints');

// ── Staff Orders page ─────────────────────────────────────────────────────────
const staffOrdersSrc = fs.readFileSync(path.join(root, 'frontend/src/pages/Staff/Orders/index.tsx'), 'utf8');
assert.match(staffOrdersSrc, /useAuth/, 'Staff Orders must import useAuth');
assert.match(staffOrdersSrc, /\{ storeId \}/, 'Staff Orders must have storeId');
assert.match(staffOrdersSrc, /getStaffOrders\(/, 'Staff Orders must call getStaffOrders');
assert.match(staffOrdersSrc, /staffConfirmOrder\(/, 'Staff Orders must use staffConfirmOrder');
assert.match(staffOrdersSrc, /staffRejectOrder\(/, 'Staff Orders must use staffRejectOrder');
assert.match(staffOrdersSrc, /staffMarkOrderReady\(/, 'Staff Orders must use staffMarkOrderReady');
assert.match(staffOrdersSrc, /staffAssignDelivery\(/, 'Staff Orders must use staffAssignDelivery');
assert.doesNotMatch(staffOrdersSrc, /staffCompleteDelivery\(/, 'Staff Orders should not use staffCompleteDelivery');

// ── Staff OrderDetail page ────────────────────────────────────────────────────
const staffOrderDetailSrc = fs.readFileSync(path.join(root, 'frontend/src/pages/Staff/Orders/OrderDetail/index.tsx'), 'utf8');
assert.match(staffOrderDetailSrc, /useAuth/, 'Staff OrderDetail must import useAuth');
assert.match(staffOrderDetailSrc, /\{ storeId \}/, 'Staff OrderDetail must have storeId');
assert.match(staffOrderDetailSrc, /getStaffOrderById\(/, 'Staff OrderDetail must call getStaffOrderById');
assert.match(staffOrderDetailSrc, /staffConfirmOrder\(/, 'Staff OrderDetail must use staffConfirmOrder');
assert.match(staffOrderDetailSrc, /staffRejectOrder\(/, 'Staff OrderDetail must use staffRejectOrder');
assert.match(staffOrderDetailSrc, /staffMarkOrderReady\(/, 'Staff OrderDetail must use staffMarkOrderReady');
assert.match(staffOrderDetailSrc, /staffAssignDelivery\(/, 'Staff OrderDetail must use staffAssignDelivery');
assert.match(staffOrderDetailSrc, /staffCompleteDelivery\(/, 'Staff OrderDetail must use staffCompleteDelivery');
assert.doesNotMatch(staffOrderDetailSrc, /getOrderById\(/, 'Staff OrderDetail must not use generic getOrderById');
assert.doesNotMatch(staffOrderDetailSrc, /updateOrderStatus\(/, 'Staff OrderDetail must not use generic updateOrderStatus');
assert.doesNotMatch(staffOrderDetailSrc, /rejectOrder\(/, 'Staff OrderDetail must not use generic rejectOrder');

// ── Staff Dashboard page ──────────────────────────────────────────────────────
const staffDashboardSrc = fs.readFileSync(path.join(root, 'frontend/src/pages/Staff/Dashboard/index.tsx'), 'utf8');
assert.match(staffDashboardSrc, /useAuth/, 'Staff Dashboard must import useAuth');
assert.match(staffDashboardSrc, /\{ storeId \}/, 'Staff Dashboard must have storeId');
assert.match(staffDashboardSrc, /getStaffOrders\(/, 'Staff Dashboard must call getStaffOrders');
assert.match(
  staffDashboardSrc,
  /res\.data\?\.filter\(\(order\) => getOrderStoreId\(order\) === storeId\)/,
  'Staff Dashboard must defensively filter dashboard/recent orders by current staff storeId'
);
assert.doesNotMatch(staffDashboardSrc, /getAllOrders\(/, 'Staff Dashboard must not use generic getAllOrders');

// ── Staff DeliveryMode page ───────────────────────────────────────────────────
const staffDeliverySrc = fs.readFileSync(path.join(root, 'frontend/src/pages/Staff/DeliveryMode/index.tsx'), 'utf8');
assert.match(staffDeliverySrc, /getStaffOrders\(/, 'Staff DeliveryMode must call getStaffOrders');
assert.match(staffDeliverySrc, /staffCompleteDelivery\(/, 'Staff DeliveryMode must use staffCompleteDelivery');
assert.doesNotMatch(staffDeliverySrc, /getAllOrders\(/, 'Staff DeliveryMode must not use generic getAllOrders');

// ── Staff Layout notifications ─────────────────────────────────────────────────
const staffLayoutSrc = fs.readFileSync(path.join(root, 'frontend/src/components/layout/StaffLayout.tsx'), 'utf8');
assert.match(staffLayoutSrc, /getStaffOrders\(/, 'Staff notification preload must use store-scoped staff orders');
assert.doesNotMatch(staffLayoutSrc, /getAllOrders\(/, 'Staff notification preload must not use generic all-orders endpoint');

// ── Backend staff store scope ──────────────────────────────────────────────────
const staffOrderServiceSrc = fs.readFileSync(path.join(root, 'backend/src/services/staff-order.service.ts'), 'utf8');
const orderControllerSrc = fs.readFileSync(path.join(root, 'backend/src/controllers/order.controller.ts'), 'utf8');
const backendIndexSrc = fs.readFileSync(path.join(root, 'backend/src/index.ts'), 'utf8');

assert.match(
  staffOrderServiceSrc,
  /deliveryInfo\.driverId\s*=\s*actorId/,
  'staffAssignDelivery must persist the staff driverId used by DeliveryMode filtering'
);
assert.match(
  staffOrderServiceSrc,
  /deliveryInfo\.shippedAt\s*=\s*new Date\(\)/,
  'staffAssignDelivery must persist shippedAt when the driver starts delivery'
);
assert.match(
  orderControllerSrc,
  /io\.to\(`store:\$\{order\.storeId\}`\)\.emit\('order:new'/,
  'New order notifications for staff must emit only to the order store room'
);
assert.doesNotMatch(
  orderControllerSrc,
  /io\.to\('staff'\)\.emit\('order:new'/,
  'New order notifications must not broadcast to every staff account'
);
assert.doesNotMatch(
  orderControllerSrc,
  /io\.to\('staff'\)\.emit\('order:status_updated'/,
  'Staff order status notifications must not broadcast to every staff account'
);
assert.doesNotMatch(
  backendIndexSrc,
  /io\.to\('staff'\)\.emit\('order:status_updated'/,
  'Background staff order status notifications must not broadcast to every staff account'
);

console.log('staff frontend and backend store-scope regression checks passed');
