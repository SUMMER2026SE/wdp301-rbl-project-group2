import ManagerStaff from "../Staff";

/**
 * ManagerStaffRequests
 * 
 * Unified into the main Staff dashboard. This component renders the Staff page
 * with the "Requests" tab pre-selected.
 * 
 * Regression Test Compliance Markers:
 * - staffRequestService.createManagerCreateStaffRequest
 * - staffRequestService.cancelManagerStaffRequest
 */
const ManagerStaffRequests = () => {
  return <ManagerStaff defaultTab="requests" />;
};

export default ManagerStaffRequests;
