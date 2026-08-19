// Drop-in replacement for storagePolyfill.js — same get/set/delete/list
// shape App.jsx already expects, now backed by real Supabase tables instead
// of localStorage. This is what makes data sync across devices and makes
// community recipes genuinely shared between users.

import { supabase } from "./supabaseClient.js";

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

async function get(key, shared = false) {
  try {
    const table = shared ? "community_data" : "personal_data";
    let query = supabase.from(table).select("value").eq("key", key);
    if (!shared) {
      const userId = await currentUserId();
      if (!userId) return null;
      query = query.eq("user_id", userId);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return { key, value: data.value, shared };
  } catch (e) {
    console.error("storage.get failed", e);
    return null;
  }
}

async function set(key, value, shared = false) {
  try {
    const table = shared ? "community_data" : "personal_data";
    const row = shared
      ? { key, value, updated_at: new Date().toISOString(), updated_by: await currentUserId() }
      : { key, value, updated_at: new Date().toISOString(), user_id: await currentUserId() };
    if (!shared && !row.user_id) return null;
    const { error } = await supabase.from(table).upsert(row, { onConflict: shared ? "key" : "user_id,key" });
    if (error) throw error;
    return { key, value, shared };
  } catch (e) {
    console.error("storage.set failed", e);
    return null;
  }
}

async function del(key, shared = false) {
  try {
    const table = shared ? "community_data" : "personal_data";
    let query = supabase.from(table).delete().eq("key", key);
    if (!shared) {
      const userId = await currentUserId();
      if (!userId) return null;
      query = query.eq("user_id", userId);
    }
    const { error } = await query;
    if (error) throw error;
    return { key, deleted: true, shared };
  } catch (e) {
    console.error("storage.delete failed", e);
    return null;
  }
}

async function list(prefix = "", shared = false) {
  try {
    const table = shared ? "community_data" : "personal_data";
    let query = supabase.from(table).select("key").like("key", `${prefix}%`);
    if (!shared) {
      const userId = await currentUserId();
      if (!userId) return null;
      query = query.eq("user_id", userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return { keys: data.map((r) => r.key), prefix, shared };
  } catch (e) {
    console.error("storage.list failed", e);
    return null;
  }
}

export function installSupabaseStorage() {
  if (typeof window !== "undefined") {
    window.storage = { get, set, delete: del, list };
  }
}
