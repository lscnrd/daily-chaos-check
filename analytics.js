import { supabase } from "./supabaseClient.js";

// Fire-and-forget — a failed analytics write should never block or break
// the app itself, so errors are logged, not thrown.
export async function logEvent(eventType, metadata = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: eventType,
      metadata,
    });
  } catch (e) {
    console.error("logEvent failed", e);
  }
}

// One row per app open. Simple, cheap, and enough to answer "how often is
// this actually being used" without building a full event-tracking system.
export function logSessionStart() {
  logEvent("session_start");
}
