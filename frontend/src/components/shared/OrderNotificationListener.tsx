import { useOrderNotifications } from "@/hooks/useOrderNotifications";

/**
 * Empty component that just registers our global notification hook.
 * Must be rendered inside a <Router> context.
 */
export const OrderNotificationListener = () => {
    useOrderNotifications();
    return null;
};
