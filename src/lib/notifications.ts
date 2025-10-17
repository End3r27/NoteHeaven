import { supabase } from "@/integrations/supabase/client";
import type { Notification } from "@/types/shared";
import type { Tables } from "@/integrations/supabase/types";

interface NewNotification {
  type: Notification["type"];
  title: string;
  content?: string;
  resourceId?: string;
  resourceType?: "note" | "folder";
  actorId?: string;
  userId: string;
}

export async function createNotification({
  type,
  title,
  content,
  resourceId,
  resourceType,
  actorId,
  userId,
}: NewNotification): Promise<Notification | null> {
  try {
    const { data, error } = await supabase
      .rpc("insert_notification", {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_content: content,
        p_resource_id: resourceId,
        p_resource_type: resourceType,
        p_actor_id: actorId,
      });

    if (error) throw error;

    return data as Notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .rpc("mark_notification_as_read", {
        p_notification_id: notificationId,
      });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select(`*, actor:profiles(*)`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    return data as unknown as Notification[];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export function subscribeToNotifications(
  userId: string,
  callback: () => void
) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}