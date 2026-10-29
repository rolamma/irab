"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "./logout-button";

type Profile = {
  full_name: string;
  grade: string | null;
  section: string | null;
};

type LessonAttempt = {
  id: string;
  lesson_number: number;
  score: number;
  passed: boolean;
  created_at: string;
};

type DashboardProps = {
  profile: Profile;
  attempts: LessonAttempt[];
};

const gradeLabels: Record<string, string> = {
  "middle-1": "الأول متوسط",
  "middle-2": "الثاني متوسط",
  "middle-3": "الثالث متوسط",
};

const stages = [
  {
    title: "التأسيس",
    description: "نتعرف على الكلمات ونميز أنواعها.",
    lessons: [
      "الاسم والفعل والحرف",
      "علامات الاسم",
      "الفعل الماضي والمضارع والأمر",
    ],
  },
  {
    title: "بناء الجملة",
    description: "نفهم مكونات الجملة ووظيفة كل كلمة.",
    lessons: [
      "الجملة الاسمية والفعلية",
      "المبتدأ والخبر",
      "الفعل والفاعل",
    ],
  },
  {
    title: "أساسيات الإعراب",
    description: "نحدد وظيفة الكلمة وعلامة إعرابها.",
    lessons: [
      "المفعول به",
      "حروف الجر والاسم المجرور",
      "علامات الإعراب الأصلية",
    ],
  },
  {
    title: "التطبيق",
    description: "نجمع ما تعلمناه ونعرب جملًا متكاملة.",
    lessons: [
      "إعراب الجملة الاسمية",
      "إعراب الجملة الفعلية",
      "تطبيق شامل",
    ],
  },
];

const allLessonTitles = stages.flatMap((stage) => stage.lessons);
const totalLessons = allLessonTitles.length;

const tabs = [
  { id: "lessons", label: "رحلتي التعليمية" },
  { id: "homework", label: "واجباتي" },
  { id: "grades", label: "درجاتي" },
] as const;

function BookIcon({
  className = "h-7 w-7",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 6.5C9 4.5 5.5 4.5 2 5.5v14c3.5-1 7-1 10 1" />
      <path d="M12 6.5c3-2 6.5-2 10-1v14c-3.5-1-7-1-10 1" />
      <path d="M12 6.5v14" />
      <path d="M5.5 9h3M5.5 12h3M15.5 9h3M15.5 12h3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="5" y="10" width="14" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v3" />
    </svg>
  );
}

export default function StudentDashboard({
  profile,
  attempts,
}: DashboardProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "lessons" | "homework" | "grades"
  >("lessons");

  // تحديث نتائج السيرفر عند فتح الصفحة أو العودة إليها.
  useEffect(() => {
    function refreshResults() {
      router.refresh();
    }

    refreshResults();

    window.addEventListener("focus", refreshResults);
    window.addEventListener("pageshow", refreshResults);

    return () => {
      window.removeEventListener("focus", refreshResults);
      window.removeEventListener("pageshow", refreshResults);
    };
  }, [router]);

  const fullName = profile.full_name.trim() || "طالبة إعراب";
  const firstName = fullName.split(/\s+/)[0];

  const gradeLabel = profile.grade
    ? gradeLabels[profile.grade] ?? "الصف غير محدد"
    : "الصف غير محدد";

  const sectionLabel = profile.section?.trim() || "غير محددة";

  // نلخص المحاولات الحقيقية لكل درس.
  const lessonResults = allLessonTitles.map((title, index) => {
    const lessonNumber = index + 1;

    const lessonAttempts = attempts.filter(
      (attempt) => attempt.lesson_number === lessonNumber
    );

    const bestScore =
      lessonAttempts.length > 0
        ? Math.max(...lessonAttempts.map((attempt) => attempt.score))
        : null;

    return {
      lessonNumber,
      title,
      attemptsCount: lessonAttempts.length,
      bestScore,
      passed: bestScore !== null && bestScore >= 80,
    };
  });

  // نحتسب الاجتياز بالترتيب دون تخطي درس غير مجتاز.
  let completedCount = 0;

  for (const lesson of lessonResults) {
    if (!lesson.passed) break;
    completedCount += 1;
  }

  const completedStages = Math.floor(completedCount / 3);

  const progressPercent = Math.round(
    (completedCount / totalLessons) * 100
  );

  const allCompleted = completedCount === totalLessons;

  const nextLessonNumber = Math.min(
    completedCount + 1,
    totalLessons
  );

  const nextLessonTitle = allLessonTitles[nextLessonNumber - 1];

  return (
    <main
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-[#f4f7fa] text-slate-900"
      style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
    >
      <header className="border-b border-slate-200 bg-white">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link
            href="/student"
            className="flex items-center gap-3 text-right"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#163553] text-teal-200 shadow-md shadow-slate-200">
              <BookIcon className="h-8 w-8" />
            </span>

            <div>
              <p className="text-2xl font-bold text-[#163553]">
                إعراب
              </p>

              <p className="mt-1 text-sm text-slate-500">
                من التأسيس إلى الإتقان
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-lg bg-teal-50 px-3 py-1.5 text-sm text-teal-800 sm:inline-block">
              حساب الطالبة
            </span>

            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-800"
              >
                {fullName.charAt(0)}
              </span>

              <div className="text-sm">
                <p className="font-bold text-[#163553]">
                  {fullName}
                </p>

                <p className="text-slate-500">
                  {gradeLabel} · الشعبة {sectionLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
        <div className="mb-7 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
          التقدم والدرجات المعروضة من حسابك، ولا تُحتسب نتائج التجربة
          القديمة في المتصفح. حاليًا اختبار الدرس الأول فقط مرتبط بحفظ
          النتائج؛ بقية الاختبارات والواجبات ما زالت تحت الربط.
        </div>

        <section className="mb-8">
          <p className="mb-2 text-sm font-bold text-teal-700">
            مساحتك التعليمية
          </p>

          <h1 className="text-3xl leading-normal font-bold text-[#163553] sm:text-4xl">
            أهلًا {firstName}، مستعدة لخطوة جديدة؟
          </h1>

          <p className="mt-3 leading-8 text-slate-500">
            ابدئي بالأساسيات، وتقدمي إلى الدرس التالي بعد إتقان ما
            تعلمتِه.
          </p>
        </section>

        <section
          aria-label="ملخص التقدم"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {[
            {
              label: "الدروس المكتملة",
              value: `${completedCount} من ${totalLessons}`,
              description:
                completedCount > 0
                  ? "أحسنتِ، اجتيازك محفوظ في حسابك"
                  : "ابدئي أول درس في رحلتك",
            },
            {
              label: "المراحل المكتملة",
              value: `${completedStages} من ${stages.length}`,
              description: "كل مرحلة تضم ثلاثة دروس",
            },
            {
              label: "نسبة الإتقان المطلوبة",
              value: "٨٠٪",
              description: "للانتقال إلى الدرس التالي",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <p className="text-sm text-slate-500">
                {item.label}
              </p>

              <p className="mt-3 text-3xl font-bold text-[#163553]">
                {item.value}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0">
            <nav
              aria-label="أقسام حساب الطالبة"
              className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                    activeTab === tab.id
                      ? "bg-teal-50 text-teal-800"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {activeTab === "lessons" && (
              <>
                {completedCount > 0 && (
                  <div
                    role="status"
                    className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4 leading-7 text-teal-900"
                  >
                    {allCompleted ? (
                      "أحسنتِ! اجتزتِ جميع دروس المسار، ويمكنك العودة إلى أي درس للمراجعة."
                    ) : (
                      <>
                        أحسنتِ! اجتزتِ {completedCount} من{" "}
                        {totalLessons} درسًا. أصبح درس
                        «{nextLessonTitle}» متاحًا لك.
                      </>
                    )}
                  </div>
                )}

                <section className="mb-7 rounded-3xl bg-[#163553] p-6 text-white sm:p-8">
                  <div className="flex items-center gap-2 text-sm font-bold text-teal-200">
                    <BookIcon className="h-5 w-5" />

                    <span>
                      {allCompleted
                        ? "اكتملت رحلتك"
                        : completedCount > 0
                          ? "خطوتك التالية"
                          : "الدرس الأول متاح لك"}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl leading-normal font-bold">
                    {allCompleted
                      ? "أحسنتِ، أكملتِ المسار!"
                      : nextLessonTitle}
                  </h2>

                  <p className="mt-3 max-w-xl leading-8 text-slate-300">
                    {allCompleted
                      ? "راجعي الدروس والتدريبات متى احتجتِ إلى تثبيت ما تعلمتِه."
                      : completedCount === 0
                        ? "نتعرف على أقسام الكلمة، ونتدرب على تمييزها بأمثلة بسيطة من حياتنا اليومية."
                        : "واصلي رحلتك مع شرح مبسط وأمثلة محلولة وتدريب واختبار للمهارة الجديدة."}
                  </p>

                  <Link
                    href={`/student/lessons/${
                      allCompleted ? 1 : nextLessonNumber
                    }`}
                    className="mt-6 inline-block rounded-xl bg-teal-200 px-6 py-3 font-bold text-[#163553] transition hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    {allCompleted
                      ? "راجعي الدرس الأول"
                      : "ابدئي الدرس"}
                  </Link>
                </section>

                <div className="mb-5">
                  <h2 className="text-xl font-bold text-[#163553]">
                    مراحل رحلتك
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    يفتح كل درس بعد اجتياز اختبار الدرس السابق بنسبة
                    ٨٠٪. نحتفظ بأفضل درجة لكل درس.
                  </p>
                </div>

                <div className="space-y-5">
                  {stages.map((stage, stageIndex) => {
                    const stageCompleted =
                      completedCount >= (stageIndex + 1) * 3;

                    const stageAvailable =
                      completedCount >= stageIndex * 3;

                    return (
                      <section
                        key={stage.title}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                      >
                        <div className="flex items-center gap-3 border-b border-slate-100 p-5">
                          <span
                            aria-hidden="true"
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold ${
                              stageAvailable
                                ? "bg-teal-100 text-teal-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {stageCompleted ? "✓" : stageIndex + 1}
                          </span>

                          <div>
                            <h3 className="font-bold text-[#163553]">
                              {stage.title}

                              {stageCompleted && (
                                <span className="mr-2 text-sm text-teal-700">
                                  مكتملة
                                </span>
                              )}
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                              {stage.description}
                            </p>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {stage.lessons.map((title, lessonIndex) => {
                            const lessonNumber =
                              stageIndex * 3 + lessonIndex + 1;

                            const lessonResult =
                              lessonResults[lessonNumber - 1];

                            const isCompleted =
                              lessonNumber <= completedCount;

                            const isAvailable =
                              lessonNumber <= completedCount + 1;

                            return (
                              <div
                                key={title}
                                className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 ${
                                  isCompleted ? "bg-teal-50/40" : ""
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-slate-400">
                                    {String(lessonNumber).padStart(2, "0")}
                                  </span>

                                  <div>
                                    <p
                                      className={`font-bold ${
                                        isAvailable
                                          ? "text-slate-800"
                                          : "text-slate-500"
                                      }`}
                                    >
                                      {title}
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                      {isCompleted
                                        ? "تم الاجتياز · يمكنك مراجعة الدرس"
                                        : "شرح وتدريب واختبار من ٥ أسئلة"}
                                    </p>

                                    {lessonResult.bestScore !== null && (
                                      <p className="mt-2 text-sm font-bold text-teal-700">
                                        أفضل درجة:{" "}
                                        {lessonResult.bestScore}٪
                                        {" · "}
                                        عدد المحاولات:{" "}
                                        {lessonResult.attemptsCount}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {isAvailable ? (
                                  <Link
                                    href={`/student/lessons/${lessonNumber}`}
                                    className={`rounded-lg px-4 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                                      isCompleted
                                        ? "bg-teal-100 text-teal-800 hover:bg-teal-200"
                                        : "bg-teal-700 text-white hover:bg-teal-800"
                                    }`}
                                  >
                                    {isCompleted
                                      ? "مكتمل · مراجعة"
                                      : "ابدئي"}
                                  </Link>
                                ) : (
                                  <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">
                                    <LockIcon />
                                    مقفل
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === "homework" && (
              <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <BookIcon className="h-8 w-8" />
                </span>

                <h2 className="mt-5 text-xl font-bold text-[#163553]">
                  لم نفعّل الواجبات بعد
                </h2>

                <p className="mx-auto mt-3 max-w-md leading-8 text-slate-500">
                  ستظهر هنا الواجبات التي تحددها المعلمة، مع موعد
                  التسليم وحالة كل واجب، بعد ربط الواجبات بالحساب.
                </p>
              </section>
            )}

            {activeTab === "grades" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <h2 className="text-xl font-bold text-[#163553]">
                  درجاتك في الاختبارات
                </h2>

                <p className="mt-3 leading-8 text-slate-500">
                  نعرض أفضل درجة محفوظة لكل درس وعدد محاولاتك.
                  إعادة الاختبار بدرجة أقل لا تلغي اجتيازك السابق.
                </p>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[540px] text-right text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                        <th className="px-4 py-4">الدرس</th>
                        <th className="px-4 py-4">أفضل درجة</th>
                        <th className="px-4 py-4">المحاولات</th>
                        <th className="px-4 py-4">الحالة</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {lessonResults.map((lesson) => (
                        <tr key={lesson.lessonNumber}>
                          <td className="px-4 py-4 font-bold text-[#163553]">
                            {lesson.lessonNumber}. {lesson.title}
                          </td>

                          <td className="px-4 py-4">
                            {lesson.bestScore === null
                              ? "—"
                              : `${lesson.bestScore}٪`}
                          </td>

                          <td className="px-4 py-4">
                            {lesson.attemptsCount}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-block rounded-lg px-3 py-1.5 text-xs font-bold ${
                                lesson.passed
                                  ? "bg-teal-50 text-teal-800"
                                  : lesson.bestScore !== null
                                    ? "bg-amber-50 text-amber-800"
                                    : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {lesson.passed
                                ? "مجتاز"
                                : lesson.bestScore !== null
                                  ? "يحتاج إعادة"
                                  : "لا توجد نتيجة"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-bold text-[#163553]">
                تقدمك في المسار
              </h2>

              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-slate-500">نسبة الإنجاز</span>

                <span className="font-bold text-teal-700">
                  {progressPercent}٪
                </span>
              </div>

              <div
                role="progressbar"
                aria-label="نسبة إنجاز الدروس"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className="h-full rounded-full bg-teal-600 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-500">
                {completedCount} من {totalLessons} درسًا مكتملًا.
                هذا التقدم مرتبط بحسابك.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="font-bold text-[#163553]">
                كيف تبدئين؟
              </h2>

              <ol className="mt-5 space-y-4">
                {[
                  "اقرئي شرح الدرس والأمثلة.",
                  "تدربي على المهارة.",
                  "حلي اختبار الدرس.",
                  "حققي ٨٠٪ لفتح الدرس التالي.",
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700"
                    >
                      {index + 1}
                    </span>

                    <span className="text-sm leading-7 text-slate-600">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-teal-100 bg-teal-50 p-6">
              <h2 className="font-bold text-teal-900">
                الخطأ فرصة للتعلم
              </h2>

              <p className="mt-3 text-sm leading-8 text-teal-800">
                إذا لم تجتازي الاختبار، راجعي الشرح وتدربي ثم حاولي
                مرة أخرى. المهم أن تفهمي، لا أن تستعجلي.
              </p>
            </section>

            <LogoutButton />
          </aside>
        </div>
      </div>
    </main>
  );
}