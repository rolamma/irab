import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function CheckStudent({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("تعذّر التحقق من صلاحية الحساب.");
  }

  if (profile.role === "teacher") {
    redirect("/teacher");
  }

  if (profile.role !== "student") {
    redirect("/");
  }

  return <>{children}</>;
}

export default function LessonsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div
          dir="rtl"
          role="status"
          className="flex min-h-screen items-center justify-center bg-[#f4f7fa] text-[#163553]"
        >
          جارٍ التحقق من تسجيل الدخول...
        </div>
      }
    >
      <CheckStudent>{children}</CheckStudent>
    </Suspense>
  );
}