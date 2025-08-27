// src/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wkojepqsyjsmvkpzsieq.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrb2plcHFzeWpzbXZrcHpzaWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMTU5NzMsImV4cCI6MjA2NDg5MTk3M30.eyvULpzUGHnSnNrVF1bxfpUZE-sAzvjlYYzaiY8X53A"; // Use SUPABASE_ANON_KEY for anon key
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indrb2plcHFzeWpzbXZrcHpzaWVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMxNTk3MywiZXhwIjoyMDY0ODkxOTczfQ.jG_KG6lEBKXWc_TqTP0BkJZouTEIR9fIFhPqZ9r3RvU"; // Optional: for admin client

// For public reads (respect RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For admin work (bypass RLS) — KEEP THIS SERVER-SIDE ONLY.
export const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
