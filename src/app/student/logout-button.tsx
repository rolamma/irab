"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogout() {
    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signOut({
        scope: "local",
      });

      if (error) {
        setErrorMessage("تعذّر تسجيل الخروج، حاولي مرة ثانية.");
        setLoading(false);
        return;
      }

      window.location.replace("/");
    } catch {
      setErrorMessage("تعذّر الاتصال، حاولي مرة ثانية.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-bold text-slate-600 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
      >
        {loading ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
      </button>

      {errorMessage && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
    </div>
  );
}