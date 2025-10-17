// src/lib/notifications.ts
// Updated to match the actual database schema

import { SupabaseClient } from "@supabase/supabase-js";
import { NotificationType } from "@/types/notifications";

export interface SendNotificationPayload {
  userId: string;
  senderId: string;
  type: NotificationType;
  title: string;
  content?: string;
  resourceId?: string;
  resourceType?: "note" | "folder";
}

export const sendNotification = async (
  supabase: SupabaseClient,
  payload: SendNotificationPayload
) => {
  const { data, error } = await supabase.from("notifications").insert({
    user_id: payload.userId,
    sender_id: payload.senderId,
    type: payload.type,
    title: payload.title,
    content: payload.content,
    resource_id: payload.resourceId,
    resource_type: payload.resourceType,
  });

  if (error) {
    console.error("DATABASE ERROR sending notification:", error);
  }

  return { data, error };
};