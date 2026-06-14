const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../..');
const authServiceSource = fs.readFileSync(
  path.join(root, 'frontend/src/services/auth.service.ts'),
  'utf8'
);
const useAuthSource = fs.readFileSync(
  path.join(root, 'frontend/src/hooks/useAuth.ts'),
  'utf8'
);

assert.match(
  authServiceSource,
  /role:\s*"ADMIN" \| "MANAGER" \| "STAFF" \| "CUSTOMER"/,
  'BEUser role type must include MANAGER'
);
assert.match(
  authServiceSource,
  /storeId\?:\s*string \| null/,
  'BEUser must expose optional storeId for manager no-store guard'
);
assert.match(
  useAuthSource,
  /isManager\s*=\s*role\?\.toUpperCase\(\) === "MANAGER"/,
  'useAuth must expose isManager helper'
);

const managerLayoutPath = path.join(root, 'frontend/src/components/layout/ManagerLayout.tsx');
const managerStoreGuardPath = path.join(root, 'frontend/src/components/guards/RequireManagerStore.tsx');
const managerDashboardPath = path.join(root, 'frontend/src/pages/Manager/Dashboard/index.tsx');
const managerNoStorePath = path.join(root, 'frontend/src/pages/Manager/NoStore/index.tsx');

const managerLayoutSource = fs.existsSync(managerLayoutPath)
  ? fs.readFileSync(managerLayoutPath, 'utf8')
  : '';
const managerStoreGuardSource = fs.existsSync(managerStoreGuardPath)
  ? fs.readFileSync(managerStoreGuardPath, 'utf8')
  : '';
const managerDashboardSource = fs.existsSync(managerDashboardPath)
  ? fs.readFileSync(managerDashboardPath, 'utf8')
  : '';
const managerNoStoreSource = fs.existsSync(managerNoStorePath)
  ? fs.readFileSync(managerNoStorePath, 'utf8')
  : '';

assert.match(managerLayoutSource, /FoodieDash Manager/, 'ManagerLayout must brand the manager workspace');
assert.match(managerLayoutSource, /\/manager\/dashboard/, 'ManagerLayout must link to manager dashboard');
assert.match(managerLayoutSource, /\/manager\/orders/, 'ManagerLayout must reserve manager orders navigation');
assert.match(managerStoreGuardSource, /Navigate to="\/manager\/no-store"/, 'manager store guard must redirect missing storeId');
assert.match(managerDashboardSource, /Tổng quan chi nhánh/, 'manager dashboard placeholder must exist');
assert.match(managerNoStoreSource, /chưa được gán chi nhánh/i, 'manager no-store page must explain missing store assignment');

const appSource = fs.readFileSync(path.join(root, 'frontend/src/App.tsx'), 'utf8');
const loginSource = fs.readFileSync(path.join(root, 'frontend/src/pages/Login/index.tsx'), 'utf8');

assert.match(appSource, /path="\/manager"\s+element=\{<ManagerLayout \/>\}/, 'App must mount /manager with ManagerLayout');
assert.match(appSource, /RequireRole allowedRoles=\{\["MANAGER"\]\}/, 'manager routes must require only MANAGER role');
assert.match(appSource, /RequireManagerStore/, 'manager routes must enforce store assignment');
assert.doesNotMatch(appSource, /RequireRole allowedRoles=\{\["ADMIN", "MANAGER"\]\}/, 'admin route guard must not allow MANAGER');
assert.match(loginSource, /case "MANAGER":\s*return "\/manager\/dashboard"/s, 'login redirect must send manager to /manager/dashboard');

const orderServiceSource = fs.readFileSync(
  path.join(root, 'frontend/src/services/order.service.ts'),
  'utf8'
);

assert.match(orderServiceSource, /getManagerOrders\(/, 'order service must expose getManagerOrders');
assert.match(orderServiceSource, /\/manager\/orders/, 'manager order service methods must call /manager/orders endpoints');
assert.match(orderServiceSource, /managerOverrideOrderStatus\(/, 'order service must expose manager status override action');

const managerOrdersPath = path.join(root, 'frontend/src/pages/Manager/Orders/index.tsx');
const managerOrderDetailPath = path.join(root, 'frontend/src/pages/Manager/Orders/OrderDetail/index.tsx');
const managerOrdersSource = fs.existsSync(managerOrdersPath) ? fs.readFileSync(managerOrdersPath, 'utf8') : '';
const managerOrderDetailSource = fs.existsSync(managerOrderDetailPath) ? fs.readFileSync(managerOrderDetailPath, 'utf8') : '';

assert.match(appSource, /import ManagerOrders from "\.\/pages\/Manager\/Orders"/, 'App must import manager orders page');
assert.match(appSource, /import ManagerOrderDetail from "\.\/pages\/Manager\/Orders\/OrderDetail"/, 'App must import manager order detail page');
assert.match(appSource, /<Route path="orders" element=\{<ManagerOrders \/>\}/, 'App must route /manager/orders');
assert.match(appSource, /<Route path="orders\/:id" element=\{<ManagerOrderDetail \/>\}/, 'App must route /manager/orders/:id');
assert.match(managerOrdersSource, /getManagerOrders/, 'ManagerOrders page must load store-scoped manager orders');
assert.match(managerOrderDetailSource, /managerOverrideOrderStatus/, 'ManagerOrderDetail must support manager status override');
assert.match(managerOrderDetailSource, /reason/i, 'ManagerOrderDetail must collect reason for sensitive override actions');

const productServiceSource = fs.readFileSync(
  path.join(root, 'frontend/src/services/product.service.ts'),
  'utf8'
);

assert.match(productServiceSource, /getManagerMenu\(/, 'product service must expose getManagerMenu');
assert.match(productServiceSource, /updateManagerProductAvailability\(/, 'product service must expose availability toggle');

const managerMenuPagePath = path.join(root, 'frontend/src/pages/Manager/Menu/index.tsx');
const managerMenuPageSource = fs.existsSync(managerMenuPagePath) ? fs.readFileSync(managerMenuPagePath, 'utf8') : '';

assert.match(appSource, /import ManagerMenu from "\.\/pages\/Manager\/Menu"/, 'App must import manager menu page');
assert.match(appSource, /<Route path="menu" element=\{<ManagerMenu \/>\}/, 'App must route /manager/menu');
assert.match(managerMenuPageSource, /getManagerMenu/, 'ManagerMenu page must load store-scoped menu');
assert.match(managerMenuPageSource, /updateManagerProductAvailability/, 'ManagerMenu page must support availability update');

const staffRequestServicePath = path.join(root, 'frontend/src/services/staff-request.service.ts');
const staffRequestServiceSource = fs.existsSync(staffRequestServicePath) ? fs.readFileSync(staffRequestServicePath, 'utf8') : '';

assert.match(staffRequestServiceSource, /getManagerStaff\(/, 'staff request service must expose manager staff list');
assert.match(staffRequestServiceSource, /createManagerCreateStaffRequest\(/, 'staff request service must expose create-staff request');
assert.match(staffRequestServiceSource, /createManagerDeactivateStaffRequest\(/, 'staff request service must expose deactivate-staff request');
assert.match(staffRequestServiceSource, /approveAdminStaffRequest\(/, 'staff request service must expose admin approve action');
assert.match(staffRequestServiceSource, /rejectAdminStaffRequest\(/, 'staff request service must expose admin reject action');

const managerStaffPagePath = path.join(root, 'frontend/src/pages/Manager/Staff/index.tsx');
const managerStaffRequestsPagePath = path.join(root, 'frontend/src/pages/Manager/StaffRequests/index.tsx');
const adminStaffRequestsPagePath = path.join(root, 'frontend/src/pages/Admin/StaffRequests/index.tsx');
const adminLayoutPath = path.join(root, 'frontend/src/components/layout/AdminLayout.tsx');
const managerStaffPageSource = fs.existsSync(managerStaffPagePath) ? fs.readFileSync(managerStaffPagePath, 'utf8') : '';
const managerStaffRequestsPageSource = fs.existsSync(managerStaffRequestsPagePath) ? fs.readFileSync(managerStaffRequestsPagePath, 'utf8') : '';
const adminStaffRequestsPageSource = fs.existsSync(adminStaffRequestsPagePath) ? fs.readFileSync(adminStaffRequestsPagePath, 'utf8') : '';
const adminLayoutSource = fs.existsSync(adminLayoutPath) ? fs.readFileSync(adminLayoutPath, 'utf8') : '';

assert.match(appSource, /import ManagerStaff from "\.\/pages\/Manager\/Staff"/, 'App must import manager staff page');
assert.match(appSource, /import ManagerStaffRequests from "\.\/pages\/Manager\/StaffRequests"/, 'App must import manager staff requests page');
assert.match(appSource, /import AdminStaffRequests from "\.\/pages\/Admin\/StaffRequests"/, 'App must import admin staff requests page');
assert.match(appSource, /<Route path="staff" element=\{<ManagerStaff \/>\}/, 'App must route /manager/staff');
assert.match(appSource, /<Route path="staff-requests" element=\{<ManagerStaffRequests \/>\}/, 'App must route /manager/staff-requests');
assert.match(appSource, /<Route path="staff-requests" element=\{<AdminStaffRequests \/>\}/, 'App must route /admin/staff-requests');
assert.match(adminLayoutSource, /\/admin\/staff-requests/, 'Admin layout must expose staff request approval navigation');
assert.match(managerStaffPageSource, /getManagerStaff/, 'ManagerStaff page must load store-scoped staff');
assert.match(managerStaffPageSource, /createManagerDeactivateStaffRequest/, 'ManagerStaff page must create deactivate requests');
assert.match(managerStaffRequestsPageSource, /createManagerCreateStaffRequest/, 'ManagerStaffRequests page must create staff requests');
assert.match(managerStaffRequestsPageSource, /cancelManagerStaffRequest/, 'ManagerStaffRequests page must cancel pending requests');
assert.match(adminStaffRequestsPageSource, /approveAdminStaffRequest/, 'AdminStaffRequests page must approve requests');
assert.match(adminStaffRequestsPageSource, /rejectAdminStaffRequest/, 'AdminStaffRequests page must reject requests');

const managerDashboardServicePath = path.join(root, 'frontend/src/services/manager-dashboard.service.ts');
const managerDashboardServiceSource = fs.existsSync(managerDashboardServicePath) ? fs.readFileSync(managerDashboardServicePath, 'utf8') : '';
const managerCashPagePath = path.join(root, 'frontend/src/pages/Manager/Cash/index.tsx');
const managerCashPageSource = fs.existsSync(managerCashPagePath) ? fs.readFileSync(managerCashPagePath, 'utf8') : '';

assert.match(managerDashboardServiceSource, /getManagerDashboardMetrics\(/, 'manager dashboard service must expose dashboard metrics');
assert.match(managerDashboardServiceSource, /getManagerCashOverview\(/, 'manager dashboard service must expose cash overview');
assert.match(managerDashboardServiceSource, /confirmManagerCodCollection\(/, 'manager dashboard service must expose COD collection action');
assert.match(appSource, /import ManagerCash from "\.\/pages\/Manager\/Cash"/, 'App must import manager cash page');
assert.match(appSource, /<Route path="cash" element=\{<ManagerCash \/>\}/, 'App must route /manager/cash');
assert.match(managerDashboardSource, /getManagerDashboardMetrics/, 'Manager dashboard must load backend metrics');
assert.match(managerCashPageSource, /getManagerCashOverview/, 'Manager cash page must load cash overview');
assert.match(managerCashPageSource, /confirmManagerCodCollection/, 'Manager cash page must confirm COD collection');

const managerSettingsPagePath = path.join(root, 'frontend/src/pages/Manager/Settings/index.tsx');
const managerSettingsPageSource = fs.existsSync(managerSettingsPagePath)
  ? fs.readFileSync(managerSettingsPagePath, 'utf8')
  : '';
const managerRouteSource = fs.readFileSync(path.join(root, 'backend/src/routes/manager.route.ts'), 'utf8');
const managerControllerSource = fs.readFileSync(path.join(root, 'backend/src/controllers/manager.controller.ts'), 'utf8');
const managerDashboardBackendSource = fs.readFileSync(
  path.join(root, 'backend/src/services/manager-dashboard.service.ts'),
  'utf8'
);

assert.match(managerDashboardServiceSource, /getManagerSettings\(/, 'manager dashboard service must expose getManagerSettings');
assert.match(managerDashboardServiceSource, /updateManagerSettings\(/, 'manager dashboard service must expose updateManagerSettings');
assert.match(managerDashboardServiceSource, /getManagerCashOverview\(\{ date \}/, 'manager cash service must send selected date');
assert.match(appSource, /import ManagerSettings from "\.\/pages\/Manager\/Settings"/, 'App must import ManagerSettings page');
assert.match(appSource, /<Route path="settings" element=\{<ManagerSettings \/>\}/, 'App must route /manager/settings');
assert.match(managerLayoutSource, /\/manager\/settings/, 'Manager layout must link to settings page');
assert.match(managerSettingsPageSource, /Giờ đóng cửa \/ chốt COD/, 'Manager settings page must expose COD cutoff close time');
assert.doesNotMatch(managerSettingsPageSource, /provider/i, 'Manager settings page must not expose shipping provider');
assert.match(managerCashPageSource, /type="date"/, 'Manager cash page must include a date picker');
assert.match(managerCashPageSource, /shouldWarnCloseout/, 'Manager cash page must show closeout warning metadata');
assert.match(managerRouteSource, /router\.get\('\/settings'/, 'Manager route must expose GET /manager/settings');
assert.match(managerRouteSource, /router\.put\('\/settings'/, 'Manager route must expose PUT /manager/settings');
assert.match(managerControllerSource, /getManagerSettingsHandler/, 'Manager controller must expose settings read handler');
assert.match(managerControllerSource, /updateManagerSettingsHandler/, 'Manager controller must expose settings update handler');
assert.match(managerDashboardBackendSource, /populate\('deliveryInfo\.driverId'/, 'Manager cash backend must populate delivery driver users');
assert.match(managerDashboardBackendSource, /selectedDate/, 'Manager cash backend must return selectedDate metadata');
assert.match(managerDashboardBackendSource, /closeTime/, 'Manager cash backend must return closeTime metadata');
assert.match(managerDashboardBackendSource, /shouldWarnCloseout/, 'Manager cash backend must return closeout warning metadata');
assert.doesNotMatch(managerDashboardBackendSource, /Unassigned driver/, 'Manager cash backend must not show English unassigned driver label');

console.log('manager frontend auth, layout, routing, login redirect, order service, order pages, menu service, menu page, staff request service, staff request pages, dashboard cash pages, and settings are present');
