import { useEffect } from "react";
import { getSupportSocket } from "@/lib/support-socket";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useNotificationSound } from "./useNotificationSound";

interface OrderStatusUpdate {
    orderId: string;
    code: string;
    status: string;
    message: string;
}

const statusColorMap: Record<string, string> = {
    pending: "border-yellow-500",
    confirmed: "border-blue-500",
    processing: "border-indigo-500",
    ready_for_delivery: "border-purple-500",
    shipping: "border-orange-500",
    completed: "border-green-500",
    cancelled: "border-red-500",
};

export const useOrderNotifications = () => {
    const navigate = useNavigate();
    const { playNotification } = useNotificationSound();

    useEffect(() => {
        const socket = getSupportSocket();

        socket.on("order:status_updated", (data: OrderStatusUpdate) => {
            console.log("Order status updated received:", data);

            playNotification();

            toast.success(data.message, {
                duration: 6000,
                position: "top-right",
                icon: '🔔',
                style: {
                    borderRadius: '16px',
                    background: '#fff',
                    color: '#333',
                    borderLeft: '4px solid',
                    borderColor: statusColorMap[data.status] || '#f97316', // orange-500 default
                },
            });

            // Optional: If user is on the track order page for this order, we could trigger a refetch
            // But for now, just the notification is a great start.
        });

        return () => {
            socket.off("order:status_updated");
        };
    }, [playNotification, navigate]);
};
