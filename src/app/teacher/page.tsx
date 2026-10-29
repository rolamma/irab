"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tab = "students" | "grades" | "homework";

type LessonResult = {
  score: number | null;
  attempts: number;
};

type Student = {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  registeredAt: string;
  results: LessonResult[];
};

type ProfileRow = {
  id: string;
  full_name: string;
  grade: string | null;
  section: string | null;
  created_at: string;
};

type AttemptRow = {
  id: string;
  student_id: string;
  lesson_number: number;
  score: number;
  created_at: string;
};

type DashboardData = {
  teacherName: string;
  students: Student[];
  loadedAt: string;
};

const lessonTitles = [
  "الاسم والفعل والحرف",
  "علامات الاسم",
  "الفعل الماضي والمضارع والأمر",
  "الجملة الاسمية والفعلية",
  "المبتدأ والخبر",
  "الفعل والفاعل",
  "المفعول به",
  "حروف الجر والاسم المجرور",
  "علامات الإعراب الأصلية",
  "إعراب الجملة الاسمية",
  "إعراب الجملة الفعلية",
  "تطبيق شامل",
];

const tabs: { id: Tab; label: string }[] = [
  { id: "students", label: "الطالبات" },
  { id: "grades", label: "الدرجات والتقدم" },
  { id: "homework", label: "الواجبات" },
];

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10";

function gradeLabel(value: string | null) {
  switch (value) {
    case "middle-1":
      return "الأول متوسط";
    case "middle-2":
      return "الثاني متوسط";
    case "middle-3":
      return "الثالث متوسط";
    default:
      return value?.trim() || "غير محدد";
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    calendar: "gregory",
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function completedLessons(student: Student) {
  let completed = 0;

  for (const result of student.results) {
    if (result.score === null || result.score < 80) break;
    completed++;
  }

  return completed;
}

function averageScore(student: Student): number | null {
  const scores = student.results.flatMap((result) =>
    result.score === null ? [] : [result.score],
  );

  if (scores.length === 0) return null;

  return Math.round(
    scores.reduce((sum, score) => sum + score, 0) / scores.length,
  );
}

function buildStudents(
  profiles: ProfileRow[],
  attempts: AttemptRow[],
): Student[] {
  const students = profiles.map((profile) => ({
    id: profile.id,
    name: profile.full_name?.trim() || "اسم غير مسجل",
    grade: profile.grade,
    section: profile.section,
    registeredAt: profile.created_at,
    results: Array.from(
      { length: lessonTitles.length },
      (): LessonResult => ({
        score: null,
        attempts: 0,
      }),
    ),
  }));

  const studentsById = new Map(
    students.map((student) => [student.id, student]),
  );

  const seenAttempts = new Set<string>();

  for (const attempt of attempts) {
    if (seenAttempts.has(attempt.id)) continue;

    seenAttempts.add(attempt.id);

    const student = studentsById.get(attempt.student_id);
    const index = attempt.lesson_number - 1;

    if (
      !student ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= lessonTitles.length
    ) {
      continue;
    }

    const result = student.results[index];

    result.attempts++;
    result.score =
      result.score === null
        ? attempt.score
        : Math.max(result.score, attempt.score);
  }

  return students;
}

function BookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
    >
      <path d="M12 6.5C9 4.5 5.5 4.5 2 5.5v14c3.5-1 7-1 10 1" />
      <path d="M12 6.5c3-2 6.5-2 10-1v14c-3.5-1-7-1-10 1" />
      <path d="M12 6.5v14" />
      <path d="M5.5 9h3M5.5 12h3M15.5 9h3M15.5 12h3" />
    </svg>
  );
}

export default function TeacherPage() {
  const [activeTab, setActiveTab] = useState<Tab>("students");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState<
    string | null
  >(null);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const requestId = useRef(0);
  const logoutLock = useRef(false);

  const loadDashboard = useCallback(async () => {
    const currentRequest = ++requestId.current;

    setLoading(true);
    setError("");
    setDashboard(null);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (currentRequest !== requestId.current) return;

      if (userError) {
        throw new Error(
          "تعذّر التحقق من حسابك. تأكدي من الاتصال ثم أعيدي المحاولة.",
        );
      }

      if (!user) {
        window.location.replace("/");
        return;
      }

      const { data: teacher, error: teacherError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (currentRequest !== requestId.current) return;

      if (teacherError || !teacher) {
        throw new Error(
          "تعذّر تحميل بيانات حساب المعلمة. نحتاج مراجعة ملف الحساب وصلاحياته.",
        );
      }

      if (teacher.role !== "teacher") {
        window.location.replace(
          teacher.role === "student" ? "/student" : "/",
        );
        return;
      }

      // نستخدم وقتًا ثابتًا لجميع دفعات هذا التحميل.
      const snapshotTime = new Date().toISOString();
      const batchSize = 1000;

      async function readProfiles(): Promise<ProfileRow[]> {
        const profiles: ProfileRow[] = [];

        for (let offset = 0; ; offset += batchSize) {
          if (currentRequest !== requestId.current) return [];

          const { data, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, grade, section, created_at")
            .eq("role", "student")
            .lte("created_at", snapshotTime)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(offset, offset + batchSize - 1);

          if (profilesError) {
            throw new Error(
              "تعذّر تحميل الطالبات. تأكدي من تنفيذ صلاحيات المعلمة في Supabase.",
            );
          }

          if (!data) {
            throw new Error("لم تصل بيانات الطالبات. أعيدي المحاولة.");
          }

          profiles.push(...data);

          if (data.length < batchSize) return profiles;
        }
      }

      async function readAttempts(): Promise<AttemptRow[]> {
        const attempts: AttemptRow[] = [];

        for (let offset = 0; ; offset += batchSize) {
          if (currentRequest !== requestId.current) return [];

          const { data, error: attemptsError } = await supabase
            .from("lesson_attempts")
            .select("id, student_id, lesson_number, score, created_at")
            .lte("created_at", snapshotTime)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(offset, offset + batchSize - 1);

          if (attemptsError) {
            throw new Error(
              "تعذّر تحميل درجات الاختبارات. نحتاج مراجعة صلاحيات قراءة النتائج.",
            );
          }

          if (!data) {
            throw new Error("لم تصل درجات الاختبارات. أعيدي المحاولة.");
          }

          attempts.push(...data);

          if (data.length < batchSize) return attempts;
        }
      }

      const [profiles, attempts] = await Promise.all([
        readProfiles(),
        readAttempts(),
      ]);

      if (currentRequest !== requestId.current) return;

      setDashboard({
        teacherName: teacher.full_name?.trim() || "حساب المعلمة",
        students: buildStudents(profiles, attempts),
        loadedAt: snapshotTime,
      });
    } catch (loadError) {
      if (currentRequest !== requestId.current) return;

      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذّر تحميل لوحة المعلمة. تحققي من الاتصال وأعيدي المحاولة.",
      );
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDashboard();

    return () => {
      requestId.current++;
    };
  }, [loadDashboard]);

  async function logout() {
    if (logoutLock.current) return;

    logoutLock.current = true;
    requestId.current++;
    setDashboard(null);
    setLoggingOut(true);
    setLogoutError("");

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });

      if (signOutError) {
        setLogoutError("تعذّر تسجيل الخروج. أعيدي المحاولة.");
        return;
      }

      window.location.replace("/");
    } catch {
      setLogoutError("تعذّر تسجيل الخروج. تأكدي من الاتصال.");
    } finally {
      logoutLock.current = false;
      setLoggingOut(false);
      setLoading(false);
    }
  }

  function changeTab(tab: Tab) {
    setActiveTab(tab);
    setSelectedStudentId(null);
  }

  const students = dashboard?.students ?? [];

  const gradeOptions = Array.from(
    new Set(students.map((student) => gradeLabel(student.grade))),
  ).sort((a, b) => a.localeCompare(b, "ar"));

  const sectionOptions = Array.from(
    new Set(
      students.map((student) => student.section?.trim() || "غير محددة"),
    ),
  ).sort((a, b) => a.localeCompare(b, "ar", { numeric: true }));

  const selectedStudent =
    students.find((student) => student.id === selectedStudentId) ?? null;

  const filteredStudents = students.filter((student) => {
    const grade = gradeLabel(student.grade);
    const section = student.section?.trim() || "غير محددة";

    return (
      student.name.includes(search.trim()) &&
      (gradeFilter === "all" || grade === gradeFilter) &&
      (sectionFilter === "all" || section === sectionFilter)
    );
  });

  const allScores = students.flatMap((student) =>
    student.results.flatMap((result) =>
      result.score === null ? [] : [result.score],
    ),
  );

  const groupAverage =
    allScores.length > 0
      ? Math.round(
          allScores.reduce((sum, score) => sum + score, 0) /
            allScores.length,
        )
      : null;

  const startedCount = students.filter((student) =>
    student.results.some((result) => result.attempts > 0),
  ).length;

  const needsSupportCount = students.filter((student) =>
    student.results.some(
      (result) => result.score !== null && result.score < 80,
    ),
  ).length;

  return (
    <main
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-[#f4f7fa] text-slate-900"
      style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            href="/teacher"
            prefetch={false}
            className="flex items-center gap-3 text-right"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#163553] text-teal-200">
              <BookIcon />
            </span>

            <div>
              <p className="text-2xl font-bold text-[#163553]">إعراب</p>
              <p className="mt-1 text-sm text-slate-500">لوحة المعلمة</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800">
              {dashboard?.teacherName.charAt(0) || "م"}
            </span>

            <div className="text-sm">
              <p className="font-bold text-[#163553]">
                {dashboard?.teacherName || "حساب المعلمة"}
              </p>
              <p className="mt-1 text-slate-500">
                متابعة الطالبات والنتائج
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {loggingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {logoutError && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-4 text-sm leading-7 text-red-800"
          >
            {logoutError}
          </p>
        )}

        <section className="mb-8">
          <p className="text-sm font-bold text-teal-700">
            المتابعة التعليمية
          </p>

          <h1 className="mt-3 text-3xl font-bold leading-normal text-[#163553] sm:text-4xl">
            تابعي التعلم، وحددي مواضع الدعم.
          </h1>

          <p className="mt-3 leading-8 text-slate-500">
            اطلعي على الطالبات المسجلات وتقدمهن، وراجعي أفضل درجاتهن
            وعدد محاولاتهن في كل درس.
          </p>
        </section>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm leading-7 text-slate-500">
            {loading
              ? "جارٍ تحميل بيانات الطالبات والنتائج..."
              : dashboard
                ? `البيانات حتى الساعة ${formatTime(dashboard.loadedAt)} بتوقيت السعودية. اضغطي تحديث لجلب أحدث النتائج.`
                : "لم تُحمّل البيانات."}
          </p>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading || loggingOut}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-teal-700 hover:bg-teal-50 disabled:cursor-wait disabled:opacity-50"
          >
            {loading ? "جارٍ التحديث..." : "تحديث البيانات"}
          </button>
        </div>

        {loading && (
          <div
            role="status"
            className="rounded-2xl border border-slate-200 bg-white p-10 text-center leading-8 text-[#163553]"
          >
            جارٍ تحميل لوحة المعلمة...
          </div>
        )}

        {!loading && error && (
          <section className="rounded-2xl border border-red-200 bg-white p-8 text-center">
            <h2 className="text-xl font-bold text-[#163553]">
              تعذّر تحميل البيانات
            </h2>

            <p role="alert" className="mt-4 leading-8 text-red-800">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={loggingOut}
              className="mt-5 rounded-xl bg-teal-700 px-6 py-3 font-bold text-white disabled:opacity-50"
            >
              إعادة المحاولة
            </button>
          </section>
        )}

        {!loading && dashboard && (
          <>
            <div className="mb-7 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm leading-7 text-teal-800">
              هذه بيانات حقيقية من حسابات الطالبات واختبارات الدروس.
              تعرض اللوحة أفضل درجة لكل درس، مع احتساب جميع المحاولات
              المحفوظة. الواجبات لم تُفعّل بعد.
            </div>

            <section
              aria-label="ملخص الطالبات"
              className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {[
                {
                  title: "الطالبات المسجلات",
                  value: students.length,
                  note: "جميع حسابات الطالبات في المبادرة",
                },
                {
                  title: "بدأن الاختبارات",
                  value: startedCount,
                  note: "لديهن محاولة محفوظة واحدة على الأقل",
                },
                {
                  title: "متوسط أفضل نتائج الدروس",
                  value:
                    groupAverage === null ? "—" : `${groupAverage}٪`,
                  note: "يشمل الدروس المختبرة فقط، ولا يشمل غير المختبرة",
                },
                {
                  title: "يحتجن إلى دعم",
                  value: needsSupportCount,
                  note: "لديهن درس مختبر أفضل درجته أقل من ٨٠٪",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <p className="text-sm text-slate-500">{item.title}</p>

                  <p className="mt-3 text-3xl font-bold text-[#163553]">
                    {item.value}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {item.note}
                  </p>
                </div>
              ))}
            </section>

            <nav
              aria-label="أقسام لوحة المعلمة"
              className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={activeTab === tab.id}
                  onClick={() => changeTab(tab.id)}
                  className={`flex-1 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold transition ${
                    activeTab === tab.id
                      ? "bg-teal-50 text-teal-800"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {activeTab !== "homework" && (
              <>
                <section
                  aria-label="البحث والتصفية"
                  className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-3"
                >
                  <div>
                    <label
                      htmlFor="student-search"
                      className="mb-2 block text-sm font-bold"
                    >
                      البحث باسم الطالبة
                    </label>

                    <input
                      id="student-search"
                      type="search"
                      value={search}
                      onChange={(event) => {
                        setSearch(event.target.value);
                        setSelectedStudentId(null);
                      }}
                      placeholder="اكتبي اسم الطالبة"
                      className={fieldClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="grade-filter"
                      className="mb-2 block text-sm font-bold"
                    >
                      الصف
                    </label>

                    <select
                      id="grade-filter"
                      value={gradeFilter}
                      onChange={(event) => {
                        setGradeFilter(event.target.value);
                        setSelectedStudentId(null);
                      }}
                      className={fieldClass}
                    >
                      <option value="all">كل الصفوف</option>

                      {gradeOptions.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="section-filter"
                      className="mb-2 block text-sm font-bold"
                    >
                      الشعبة
                    </label>

                    <select
                      id="section-filter"
                      value={sectionFilter}
                      onChange={(event) => {
                        setSectionFilter(event.target.value);
                        setSelectedStudentId(null);
                      }}
                      className={fieldClass}
                    >
                      <option value="all">كل الشعب</option>

                      {sectionOptions.map((section) => (
                        <option key={section} value={section}>
                          {section === "غير محددة"
                            ? section
                            : `الشعبة ${section}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                    <h2 className="text-xl font-bold text-[#163553]">
                      {activeTab === "students"
                        ? "الطالبات المسجلات"
                        : "متابعة الدرجات والتقدم"}
                    </h2>

                    <span className="text-sm text-slate-500">
                      عدد النتائج: {filteredStudents.length}
                    </span>
                  </div>

                  {filteredStudents.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <h3 className="font-bold text-[#163553]">
                        {students.length === 0
                          ? "لا توجد طالبات مسجلات حتى الآن"
                          : "لا توجد طالبات تطابق البحث"}
                      </h3>

                      <p className="mt-3 leading-8 text-slate-500">
                        {students.length === 0
                          ? "ستظهر حسابات الطالبات هنا بعد التسجيل. إذا كنتِ متأكدة من وجود حسابات، نراجع صلاحيات قراءتها."
                          : "جرّبي اسمًا آخر أو غيّري خيارات التصفية."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <caption className="sr-only">
                          بيانات الطالبات وتقدمهن في الدروس
                        </caption>

                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th scope="col" className="px-5 py-4">
                              الطالبة
                            </th>

                            <th scope="col" className="px-5 py-4">
                              الصف والشعبة
                            </th>

                            <th scope="col" className="px-5 py-4">
                              {activeTab === "students"
                                ? "تاريخ التسجيل"
                                : "متوسط أفضل النتائج"}
                            </th>

                            <th scope="col" className="px-5 py-4">
                              الدروس المكتملة بالتسلسل
                            </th>

                            <th scope="col" className="px-5 py-4">
                              التفاصيل
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {filteredStudents.map((student) => {
                            const completed = completedLessons(student);
                            const average = averageScore(student);

                            return (
                              <tr key={student.id}>
                                <th
                                  scope="row"
                                  className="whitespace-nowrap px-5 py-5 font-bold text-[#163553]"
                                >
                                  {student.name}
                                </th>

                                <td className="whitespace-nowrap px-5 py-5 text-slate-600">
                                  {gradeLabel(student.grade)}

                                  <span className="mt-1 block text-slate-500">
                                    الشعبة:{" "}
                                    {student.section?.trim() || "غير محددة"}
                                  </span>
                                </td>

                                <td className="whitespace-nowrap px-5 py-5 text-slate-600">
                                  {activeTab === "students"
                                    ? formatDate(student.registeredAt)
                                    : average === null
                                      ? "لم تختبر بعد"
                                      : `${average}٪`}
                                </td>

                                <td className="min-w-40 px-5 py-5">
                                  <p className="mb-2 font-bold text-teal-700">
                                    {completed} من ١٢
                                  </p>

                                  <div
                                    role="progressbar"
                                    aria-label={`تقدم ${student.name}`}
                                    aria-valuemin={0}
                                    aria-valuemax={12}
                                    aria-valuenow={completed}
                                    className="h-2 overflow-hidden rounded-full bg-slate-100"
                                  >
                                    <div
                                      className="h-full rounded-full bg-teal-600"
                                      style={{
                                        width: `${(completed / 12) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </td>

                                <td className="px-5 py-5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedStudentId(student.id)
                                    }
                                    aria-label={`عرض تفاصيل ${student.name}`}
                                    className="whitespace-nowrap rounded-lg bg-teal-50 px-4 py-2 font-bold text-teal-800 hover:bg-teal-100"
                                  >
                                    عرض التفاصيل
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {selectedStudent && (
                  <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-6">
                      <div>
                        <p className="text-sm font-bold text-teal-700">
                          تفاصيل الطالبة
                        </p>

                        <h2 className="mt-2 text-2xl font-bold text-[#163553]">
                          {selectedStudent.name}
                        </h2>

                        <p className="mt-2 text-sm leading-7 text-slate-500">
                          {gradeLabel(selectedStudent.grade)} · الشعبة:{" "}
                          {selectedStudent.section?.trim() || "غير محددة"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedStudentId(null)}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                      >
                        إغلاق التفاصيل
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <caption className="sr-only">
                          نتائج دروس {selectedStudent.name}
                        </caption>

                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th scope="col" className="px-5 py-4">
                              الدرس
                            </th>
                            <th scope="col" className="px-5 py-4">
                              أفضل درجة
                            </th>
                            <th scope="col" className="px-5 py-4">
                              المحاولات
                            </th>
                            <th scope="col" className="px-5 py-4">
                              الحالة
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {lessonTitles.map((title, index) => {
                            const result =
                              selectedStudent.results[index];

                            const tested = result.score !== null;
                            const passed =
                              result.score !== null &&
                              result.score >= 80;

                            return (
                              <tr key={title}>
                                <th
                                  scope="row"
                                  className="min-w-52 px-5 py-4 font-bold text-[#163553]"
                                >
                                  {index + 1}. {title}
                                </th>

                                <td className="px-5 py-4">
                                  {tested ? `${result.score}٪` : "—"}
                                </td>

                                <td className="px-5 py-4">
                                  {result.attempts}
                                </td>

                                <td className="whitespace-nowrap px-5 py-4">
                                  <span
                                    className={`rounded-lg px-3 py-1.5 text-sm ${
                                      !tested
                                        ? "bg-slate-100 text-slate-500"
                                        : passed
                                          ? "bg-teal-50 text-teal-800"
                                          : "bg-amber-50 text-amber-900"
                                    }`}
                                  >
                                    {!tested
                                      ? "لم تختبر"
                                      : passed
                                        ? "مجتازة"
                                        : "تحتاج دعمًا"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </>
            )}

            {activeTab === "homework" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <h2 className="text-2xl font-bold text-[#163553]">
                  الواجبات
                </h2>

                <p className="mx-auto mt-4 max-w-xl leading-8 text-slate-500">
                  لم تُفعّل الواجبات بعد. سنربط إنشاء الواجبات وتسليم
                  إجابات الطالبات ومراجعتها في خطوة لاحقة.
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}