import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentDashboard from "./student-dashboard";

type LessonAttempt = {
  id: string;
  lesson_number: number;
  score: number;
  passed: boolean;
  created_at: string;
};

function LoadingError({ message }: { message: string }) {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-slate-50 p-6"
    >
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold text-[#163553]">
          تعذّر تحميل البيانات
        </h1>

        <p className="mt-4 leading-8 text-slate-600">
          {message}
        </p>

        <a
          href="/student"
          className="mt-5 inline-block font-bold text-teal-700"
        >
          إعادة المحاولة
        </a>
      </div>
    </main>
  );
}

async function StudentAccount() {
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
    .select("full_name, grade, section, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <LoadingError message="تعذّر تحميل بيانات حسابك. حدّثي الصفحة، وإذا استمرت المشكلة نراجع جدول الحسابات وصلاحياته." />
    );
  }

  if (profile.role === "teacher") {
    redirect("/teacher");
  }

  if (profile.role !== "student") {
    redirect("/");
  }

  // نجلب محاولات صاحبة الحساب فقط.
  const attempts: LessonAttempt[] = [];

  const batchSize = 1000;
  const snapshotTime = new Date().toISOString();
  let offset = 0;

  while (true) {
    const { data, error: attemptsError } = await supabase
      .from("lesson_attempts")
      .select("id, lesson_number, score, passed, created_at")
      .eq("student_id", user.id)
      .lte("created_at", snapshotTime)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (attemptsError || !data) {
      return (
        <LoadingError message="تعذّر تحميل نتائج الاختبارات. أعيدي المحاولة، ولن نعرض نتائج المتصفح التجريبية بدل نتائج حسابك." />
      );
    }

    attempts.push(...data);

    if (data.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  // نجهّز النتائج لإرسالها للواجهة.
  // سنحدّث الواجهة لاستخدامها في الخطوة التالية.
  const dashboardProps = {
    profile: {
      full_name: profile.full_name,
      grade: profile.grade,
      section: profile.section,
    },
    attempts,
  };

  return <StudentDashboard {...dashboardProps} />;
}

export default function StudentPage() {
  return (
    <Suspense
      fallback={
        <div
          dir="rtl"
          role="status"
          className="flex min-h-screen items-center justify-center bg-[#f4f7fa] text-[#163553]"
        >
          جارٍ تحميل حسابك ونتائجك...
        </div>
      }
    >
      <StudentAccount />
    </Suspense>
  );
}