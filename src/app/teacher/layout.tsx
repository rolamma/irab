import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function CheckTeacher({
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

  if (profile.role === "student") {
    redirect("/student");
  }

  if (profile.role !== "teacher") {
    redirect("/");
  }

  return <>{children}</>;
}

export default function TeacherLayout({
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
          جارٍ التحقق من صلاحية الحساب...
        </div>
      }
    >
      <CheckTeacher>{children}</CheckTeacher>
    </Suspense>
  );
}