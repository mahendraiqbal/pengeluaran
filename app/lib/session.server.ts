import { redirect } from "react-router";
import { supabase } from "./supabase.server";

export async function requireAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  
  if (!authHeader) {
    throw redirect("/login");
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw redirect("/login");
  }

  return user;
}

export async function getSession(request: Request) {
  const authHeader = request.headers.get("Authorization");
  
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);

  return user;
}
