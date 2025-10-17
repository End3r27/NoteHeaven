import { SupabaseClient } from "@supabase/supabase-js";
import { NotificationType } from "@/types/notifications";

export interface SendNotificationPayload {
  userId: string;
  senderId: string;
  type: NotificationType;
  message: string;
  data?: Record<string, any>;
}

export const sendNotification = async (
  supabase: SupabaseClient,
  payload: SendNotificationPayload
) => {
  const { data, error } = await supabase.from("notifications").insert({
    user_id: payload.userId,
    sender_id: payload.senderId,
    type: payload.type,
    message: payload.message,
    data: payload.data,
  });

  if (error) {
    console.error("Error sending notification:", error);
    throw error;
  }

  return data;
};
