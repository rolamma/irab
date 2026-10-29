import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "بيانات Supabase ناقصة. تأكدي من إعداد ملف .env.local."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}