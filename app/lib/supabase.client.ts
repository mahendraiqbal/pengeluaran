import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase.server";

const supabaseUrl = typeof window !== "undefined" 
  ? window.ENV?.SUPABASE_URL 
  : "";
const supabaseAnonKey = typeof window !== "undefined" 
  ? window.ENV?.SUPABASE_ANON_KEY 
  : "";

export const supabaseClient = createClient<Database>(
  supabaseUrl || "",
  supabaseAnonKey || ""
);
