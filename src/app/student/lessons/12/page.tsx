"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Tab = "explanation" | "practice" | "quiz";

type QuizFeedback = {
  correct_index: number;
  is_correct: boolean;
  explanation: string;
};

type QuizResult = {
  attempt_id: string;
  score: number;
  correct_count: number;
  passed: boolean;
  feedback: QuizFeedback[];
};

type PendingAttempt = {
  id: string;
  userId: string;
  answers: number[];
};

const reviewSteps = [
  {
    title: "أفهم الجملة",
    description:
      "أقرأ الجملة كاملة وأحدد معناها، ثم أميز بين الجملة الاسمية والفعلية في الأمثلة التي تعلمناها.",
  },
  {
    title: "أحدد وظيفة الكلمة",
    description:
      "أبحث عن المبتدأ والخبر، أو الفعل والفاعل، ثم المفعول به أو حرف الجر والاسم المجرور إن وجدا.",
  },
  {
    title: "أكمل الإعراب",
    description:
      "أذكر وظيفة الكلمة وحالتها وعلامتها، وأميز بين الاسم المعرب والفعل الماضي المبني والحرف.",
  },
];

const examples = [
  {
    title: "جملة اسمية",
    sentence: "الحديقةُ جميلةٌ.",
    words: [
      {
        word: "الحديقةُ",
        parsing:
          "مبتدأ مرفوع، وعلامة رفعه الضمة الظاهرة على آخره.",
      },
      {
        word: "جميلةٌ",
        parsing:
          "خبر مرفوع، وعلامة رفعه الضمة الظاهرة على آخره.",
      },
    ],
  },
  {
    title: "جملة فعلية",
    sentence: "كتبَ الطالبُ الدرسَ في الدفترِ.",
    words: [
      {
        word: "كتبَ",
        parsing: "فعل ماضٍ مبني على الفتح الظاهر على آخره.",
      },
      {
        word: "الطالبُ",
        parsing:
          "فاعل مرفوع، وعلامة رفعه الضمة الظاهرة على آخره.",
      },
      {
        word: "الدرسَ",
        parsing:
          "مفعول به منصوب، وعلامة نصبه الفتحة الظاهرة على آخره.",
      },
      {
        word: "في",
        parsing: "حرف جر مبني لا محل له من الإعراب.",
      },
      {
        word: "الدفترِ",
        parsing:
          "اسم مجرور بفي، وعلامة جره الكسرة الظاهرة على آخره.",
      },
    ],
  },
  {
    title: "فعل مضارع مجزوم",
    sentence: "لم يكتبْ خالدٌ.",
    words: [
      {
        word: "لم",
        parsing: "حرف نفي وجزم وقلب مبني لا محل له من الإعراب.",
      },
      {
        word: "يكتبْ",
        parsing:
          "فعل مضارع مجزوم بلم، وعلامة جزمه السكون الظاهر على آخره.",
      },
      {
        word: "خالدٌ",
        parsing:
          "فاعل مرفوع، وعلامة رفعه الضمة الظاهرة على آخره.",
      },
    ],
  },
];

const questions = [
  {
    question: "ما نوع جملة «الطالبُ يقرأُ»؟",
    options: [
      "جملة اسمية؛ لأنها بدأت بالاسم «الطالب».",
      "جملة فعلية؛ لأنها تحتوي على فعل.",
      "ليست جملة مفيدة.",
    ],
  },
  {
    question: "أي إعراب صحيح لجملة «السماءُ صافيةٌ»؟",
    options: [
      "السماءُ فاعل مرفوع، وصافيةٌ مفعول به منصوب.",
      "السماءُ مبتدأ مرفوع، وصافيةٌ خبر مرفوع، وعلامة رفع كل منهما الضمة الظاهرة.",
      "السماءُ اسم مجرور، وصافيةٌ خبر منصوب.",
    ],
  },
  {
    question: "أي تحليل صحيح لجملة «فتحَ خالدٌ البابَ»؟",
    options: [
      "فتحَ اسم، وخالدٌ مبتدأ، والبابَ خبر.",
      "فتحَ فعل ماضٍ منصوب، وخالدٌ مفعول به، والبابَ فاعل.",
      "فتحَ فعل ماضٍ مبني على الفتح، وخالدٌ فاعل مرفوع بالضمة، والبابَ مفعول به منصوب بالفتحة.",
    ],
  },
  {
    question: "ما إعراب «الفصلِ» في جملة «جلسَ المعلمُ في الفصلِ»؟",
    options: [
      "اسم مجرور بفي، وعلامة جره الكسرة الظاهرة.",
      "مفعول به منصوب، وعلامة نصبه الفتحة الظاهرة.",
      "فاعل مرفوع، وعلامة رفعه الضمة الظاهرة.",
    ],
  },
  {
    question: "ما إعراب «يلعبْ» في جملة «لم يلعبْ الطفلُ»؟",
    options: [
      "فعل أمر مبني على السكون.",
      "فعل مضارع مجزوم بلم، وعلامة جزمه السكون الظاهر.",
      "فعل ماضٍ مبني على الفتح.",
    ],
  },
];

const practiceQuestions = [
  {
    sentence: "المعلمُ حاضرٌ.",
    question: "ما وظيفة «حاضرٌ» وعلامة إعرابها؟",
    options: [
      "خبر مرفوع بالضمة الظاهرة.",
      "فاعل مرفوع بالضمة الظاهرة.",
      "مفعول به منصوب بالفتحة الظاهرة.",
    ],
    correct: 0,
    explanation:
      "حاضرٌ خبر يخبرنا عن المعلم ويتمم المعنى، وهو مرفوع بالضمة الظاهرة.",
  },
  {
    sentence: "قرأَ الطالبُ القصةَ.",
    question: "ما وظيفة «القصةَ» وعلامة إعرابها؟",
    options: [
      "فاعل مرفوع بالضمة الظاهرة.",
      "مفعول به منصوب بالفتحة الظاهرة.",
      "اسم مجرور بالكسرة الظاهرة.",
    ],
    correct: 1,
    explanation:
      "القصةَ مفعول به؛ لأنها وقع عليها فعل القراءة، وهي منصوبة بالفتحة الظاهرة.",
  },
  {
    sentence: "ذهبَ خالدٌ إلى المكتبةِ.",
    question: "ما وظيفة «المكتبةِ» وعلامة إعرابها؟",
    options: [
      "خبر مرفوع بالضمة الظاهرة.",
      "مفعول به منصوب بالفتحة الظاهرة.",
      "اسم مجرور بإلى، وعلامة جره الكسرة الظاهرة.",
    ],
    correct: 2,
    explanation:
      "المكتبةِ اسم مجرور بحرف الجر «إلى»، وعلامة جره الكسرة الظاهرة.",
  },
];

const tabs: { id: Tab; label: string }[] = [
  { id: "explanation", label: "١. المراجعة والأمثلة" },
  { id: "practice", label: "٢. التدريب" },
  { id: "quiz", label: "٣. الاختبار الختامي" },
];

function isQuizResult(value: unknown): value is QuizResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as Partial<QuizResult>;

  return (
    typeof result.attempt_id === "string" &&
    typeof result.score === "number" &&
    [0, 20, 40, 60, 80, 100].includes(result.score) &&
    typeof result.correct_count === "number" &&
    Number.isInteger(result.correct_count) &&
    result.correct_count >= 0 &&
    result.correct_count <= questions.length &&
    result.score === result.correct_count * 20 &&
    typeof result.passed === "boolean" &&
    result.passed === (result.score >= 80) &&
    Array.isArray(result.feedback) &&
    result.feedback.length === questions.length &&
    result.feedback.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        Number.isInteger(item.correct_index) &&
        item.correct_index >= 0 &&
        item.correct_index < 3 &&
        typeof item.is_correct === "boolean" &&
        typeof item.explanation === "string",
    )
  );
}

function submissionErrorMessage(code: string, message: string) {
  if (message.includes("AUTH_REQUIRED")) {
    return "انتهت جلسة الدخول. سجّلي دخولك مجددًا ثم أعيدي المحاولة.";
  }

  if (message.includes("STUDENT_REQUIRED")) {
    return "إرسال الاختبار متاح لحسابات الطالبات فقط.";
  }

  if (message.includes("PREVIOUS_LESSON_REQUIRED")) {
    return "لا يمكن إرسال الاختبار الختامي قبل اجتياز الدروس الأحد عشر السابقة بنسبة ٨٠٪ على الأقل لكل درس.";
  }

  if (message.includes("INVALID_ANSWERS")) {
    return "تعذّر اعتماد الإجابات. حدّثي الصفحة وأجيبي عن الأسئلة الخمسة.";
  }

  if (message.includes("ATTEMPT_CONFLICT")) {
    return "حدث تعارض في بيانات المحاولة. حدّثي الصفحة قبل المحاولة مجددًا.";
  }

  if (code === "PGRST202") {
    return "دالة حفظ اختبار الدرس الثاني عشر غير متاحة. تأكدي من تنفيذ كود SQL الخاص به.";
  }

  if (code === "42501") {
    return "لا توجد صلاحية لحفظ الاختبار. نحتاج مراجعة صلاحيات دالة الدرس الثاني عشر.";
  }

  return "تعذّر التأكد من حفظ المحاولة. اضغطي إعادة إرسال نفس المحاولة؛ لن تُحسب مرتين.";
}

export default function TwelfthLessonPage() {
  const [tab, setTab] = useState<Tab>("explanation");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [practiceAnswers, setPracticeAnswers] = useState<
    Record<number, number>
  >({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attemptStarted, setAttemptStarted] = useState(false);
  const [error, setError] = useState("");

  const pendingAttempt = useRef<PendingAttempt | null>(null);
  const submitLock = useRef(false);

  const submitted = result !== null;
  const inputsLocked = submitted || submitting || attemptStarted;

  const answeredCount = questions.filter(
    (question, index) =>
      Number.isInteger(answers[index]) &&
      answers[index] >= 0 &&
      answers[index] < question.options.length,
  ).length;

  function changeTab(nextTab: Tab) {
    if (submitLock.current) return;

    setTab(nextTab);

    if (!pendingAttempt.current) {
      setError("");
    }
  }

  async function submitQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitLock.current || result) return;

    if (answeredCount !== questions.length) {
      setError("أجيبي عن الأسئلة الخمسة قبل إرسال الاختبار.");
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setError("");

    const selectedAnswers =
      pendingAttempt.current?.answers ??
      questions.map((_, index) => answers[index]);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "تعذّر التحقق من تسجيل دخولك. تأكدي من الاتصال، وسجّلي دخولك مجددًا إذا انتهت الجلسة.",
        );
        return;
      }

      if (
        pendingAttempt.current &&
        pendingAttempt.current.userId !== user.id
      ) {
        setError(
          "تغيّر الحساب المستخدم. حدّثي الصفحة قبل إرسال الاختبار.",
        );
        return;
      }

      if (!pendingAttempt.current) {
        pendingAttempt.current = {
          id: window.crypto.randomUUID(),
          userId: user.id,
          answers: selectedAnswers,
        };

        setAttemptStarted(true);
      }

      const attempt = pendingAttempt.current;

      const { data, error: submitError } = await supabase.rpc(
        "submit_lesson_twelve",
        {
          p_answers: attempt.answers,
          p_attempt_id: attempt.id,
        },
      );

      if (submitError) {
        setError(
          submissionErrorMessage(
            submitError.code ?? "",
            submitError.message ?? "",
          ),
        );
        return;
      }

      if (!isQuizResult(data) || data.attempt_id !== attempt.id) {
        setError(
          "وصل رد غير متوقع من الخادم. أعيدي إرسال نفس المحاولة للتأكد من النتيجة دون احتسابها مرتين.",
        );
        return;
      }

      setResult(data);
    } catch {
      setError(
        "تعذّر الاتصال بالخادم أو التأكد من الحفظ. تحققي من الإنترنت ثم أعيدي إرسال نفس المحاولة؛ لن تُحسب مرتين.",
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  function retryQuiz() {
    if (submitLock.current || !result) return;

    pendingAttempt.current = null;
    setAnswers({});
    setResult(null);
    setAttemptStarted(false);
    setError("");
  }

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
            href="/student"
            prefetch={false}
            className="text-2xl font-bold text-[#163553]"
          >
            إعراب
          </Link>

          <Link
            href="/student"
            prefetch={false}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            العودة إلى رحلتي
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <div className="mb-7 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm leading-7 text-teal-800">
          الاختبار الختامي مرتبط بحسابك، وتُحفظ نتيجتك بعد الإرسال.
          يتطلب إرسال الاختبار اجتياز الدروس الأحد عشر السابقة بنسبة
          ٨٠٪ على الأقل لكل درس.
        </div>

        <section className="mb-8">
          <p className="text-sm font-bold text-teal-700">
            مرحلة التطبيق · الدرس الثاني عشر
          </p>

          <h1 className="mt-3 text-3xl font-bold leading-normal text-[#163553] sm:text-4xl">
            تطبيق شامل
          </h1>

          <p className="mt-4 leading-8 text-slate-500">
            نراجع المهارات الأساسية التي تعلمناها، ونطبقها على جمل
            اسمية وفعلية متنوعة قبل إكمال المسار التأسيسي.
          </p>
        </section>

        <nav
          aria-label="أجزاء الدرس"
          className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2"
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={submitting}
              aria-pressed={tab === item.id}
              onClick={() => changeTab(item.id)}
              className={`flex-1 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-wait disabled:opacity-60 ${
                tab === item.id
                  ? "bg-teal-50 text-teal-800"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {tab === "explanation" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[#163553]">
              اجمعي المهارات في خطوات واضحة
            </h2>

            <p className="mt-4 leading-8 text-slate-600">
              الإعراب ليس حفظ حركة آخر الكلمة فقط؛ بل فهم وظيفتها
              وعلاقتها بالكلمات الأخرى، ثم ذكر حالتها وعلامتها
              المناسبة، أو بيان بنائها إذا كانت مبنية.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {reviewSteps.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 font-bold text-teal-800">
                    {index + 1}
                  </span>

                  <h3 className="mt-4 text-lg font-bold text-teal-700">
                    {item.title}
                  </h3>

                  <p className="mt-3 leading-8 text-slate-600">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-7 rounded-2xl border-r-4 border-teal-600 bg-teal-50 p-6">
              <h3 className="text-xl font-bold text-[#163553]">
                ملخص ما تعلمناه
              </h3>

              <ul className="mt-4 space-y-3 leading-8 text-slate-700">
                <li>
                  <strong>أقسام الكلمة:</strong> اسم وفعل وحرف.
                </li>

                <li>
                  <strong>من علامات الاسم:</strong> قبول «الـ»
                  والتنوين والجر.
                </li>

                <li>
                  <strong>أنواع الفعل:</strong> ماضٍ ومضارع وأمر.
                </li>

                <li>
                  <strong>المبتدأ والخبر:</strong> مرفوعان.
                </li>

                <li>
                  <strong>الفاعل:</strong> مرفوع.
                </li>

                <li>
                  <strong>المفعول به:</strong> منصوب.
                </li>

                <li>
                  <strong>الاسم بعد حرف الجر:</strong> مجرور به.
                </li>

                <li>
                  <strong>العلامات الأصلية:</strong> الضمة للرفع،
                  والفتحة للنصب، والكسرة للجر، والسكون للجزم.
                </li>
              </ul>
            </div>

            <h3 className="mt-8 text-xl font-bold text-[#163553]">
              أمثلة تجمع المهارات
            </h3>

            <div className="mt-4 space-y-5">
              {examples.map((item) => (
                <article
                  key={item.sentence}
                  className="overflow-hidden rounded-2xl border border-slate-200"
                >
                  <div className="bg-slate-50 p-5">
                    <p className="text-sm font-bold text-teal-700">
                      {item.title}
                    </p>

                    <p className="mt-2 text-2xl font-bold leading-loose text-[#163553]">
                      {item.sentence}
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {item.words.map((word) => (
                      <div
                        key={word.word}
                        className="grid gap-2 p-5 sm:grid-cols-[110px_1fr]"
                      >
                        <p className="text-lg font-bold text-teal-700">
                          {word.word}
                        </p>

                        <p className="leading-8 text-slate-600">
                          {word.parsing}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-slate-100 p-5 leading-8 text-slate-600">
              <strong className="text-[#163553]">
                راجعي هذه الأخطاء الشائعة:
              </strong>

              <ul className="mt-3 list-inside list-disc space-y-2">
                <li>
                  لا تجعلي كل اسم بعد الفعل مفعولًا به؛ فقد يكون
                  فاعلًا.
                </li>

                <li>
                  لا تعربي الاسم بعد حرف الجر مفعولًا به.
                </li>

                <li>
                  لا تقولي إن الفعل الماضي منصوب لمجرد ظهور الفتحة.
                </li>

                <li>
                  لا تعدّي كل جملة تحتوي على فعل جملة فعلية.
                </li>

                <li>
                  لا تفترضي وجود مفعول به في كل جملة فعلية.
                </li>
              </ul>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-5 leading-8 text-slate-600">
              <strong className="text-[#163553]">
                هذا مسار تأسيسي:{" "}
              </strong>
              ركزنا على تراكيب بسيطة وأسماء مفردة بعلامات ظاهرة.
              إكماله لا يعني دراسة جميع أبواب النحو، بل بناء أساس
              يساعدك على تعلم موضوعات أوسع لاحقًا.
            </div>

            <button
              type="button"
              onClick={() => changeTab("practice")}
              className="mt-7 rounded-xl bg-teal-700 px-6 py-3 font-bold text-white transition hover:bg-teal-800"
            >
              انتقلي إلى التدريب
            </button>
          </section>
        )}

        {tab === "practice" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[#163553]">
              تدريب شامل
            </h2>

            <p className="mt-3 leading-8 text-slate-500">
              حددي وظيفة الكلمة أولًا، ثم اختاري إعرابها. التدريب
              لا يدخل في درجة الاختبار، ويمكنك تغيير إجابتك.
            </p>

            <div className="mt-6 space-y-5">
              {practiceQuestions.map((question, index) => {
                const selected = practiceAnswers[index];
                const hasAnswer = selected !== undefined;
                const isCorrect = selected === question.correct;

                return (
                  <fieldset
                    key={question.sentence}
                    className="min-w-0 rounded-2xl border border-slate-200 p-5"
                  >
                    <legend className="px-2 font-bold leading-8 text-[#163553]">
                      {question.question}
                    </legend>

                    <p className="mt-2 rounded-xl bg-slate-50 p-4 text-xl leading-8 text-[#163553]">
                      {question.sentence}
                    </p>

                    <div className="mt-4 grid gap-3">
                      {question.options.map((option, optionIndex) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={selected === optionIndex}
                          onClick={() =>
                            setPracticeAnswers((previous) => ({
                              ...previous,
                              [index]: optionIndex,
                            }))
                          }
                          className={`rounded-xl border px-4 py-3 text-right font-bold leading-8 transition ${
                            selected === optionIndex
                              ? "border-teal-700 bg-teal-50 text-teal-800"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    {hasAnswer && (
                      <p
                        role="status"
                        className={`mt-4 rounded-xl p-4 text-sm leading-7 ${
                          isCorrect
                            ? "bg-teal-50 text-teal-900"
                            : "bg-amber-50 text-amber-900"
                        }`}
                      >
                        {isCorrect
                          ? `أحسنتِ! ${question.explanation}`
                          : "حاولي مجددًا. اقرئي الجملة وحددي علاقتها بالكلمة المطلوبة، ثم راجعي الحالة الإعرابية والعلامة."}
                      </p>
                    )}
                  </fieldset>
                );
              })}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => changeTab("quiz")}
                className="rounded-xl bg-teal-700 px-6 py-3 font-bold text-white hover:bg-teal-800"
              >
                انتقلي إلى الاختبار الختامي
              </button>

              <button
                type="button"
                onClick={() => changeTab("explanation")}
                className="rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-600 hover:bg-slate-50"
              >
                راجعي الأمثلة
              </button>
            </div>
          </section>
        )}

        {tab === "quiz" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[#163553]">
              الاختبار الختامي للمسار
            </h2>

            <p className="mt-3 leading-8 text-slate-500">
              خمسة أسئلة، لكل سؤال ٢٠ درجة. تحتاجين أربع إجابات
              صحيحة لتحقيق نسبة الإتقان المطلوبة: ٨٠٪.
            </p>

            <form
              onSubmit={submitQuiz}
              aria-busy={submitting}
              className="mt-7"
            >
              <div className="space-y-6">
                {questions.map((question, index) => {
                  const feedback = result?.feedback[index];

                  return (
                    <fieldset
                      key={question.question}
                      disabled={inputsLocked}
                      className="min-w-0 rounded-2xl border border-slate-200 p-5"
                    >
                      <legend className="px-2 font-bold leading-8 text-[#163553]">
                        {index + 1}. {question.question}
                      </legend>

                      <div className="mt-3 grid gap-3">
                        {question.options.map((option, optionIndex) => (
                          <label
                            key={option}
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm leading-8 ${
                              inputsLocked
                                ? "cursor-default"
                                : "cursor-pointer"
                            } ${
                              answers[index] === optionIndex
                                ? "border-teal-700 bg-teal-50 text-teal-900"
                                : "border-slate-200 text-slate-600"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${index}`}
                              value={optionIndex}
                              checked={answers[index] === optionIndex}
                              disabled={inputsLocked}
                              onChange={() => {
                                if (
                                  submitLock.current ||
                                  pendingAttempt.current ||
                                  result
                                ) {
                                  return;
                                }

                                setAnswers((previous) => ({
                                  ...previous,
                                  [index]: optionIndex,
                                }));
                                setError("");
                              }}
                              className="h-4 w-4 shrink-0 accent-teal-700"
                            />

                            <span>{option}</span>
                          </label>
                        ))}
                      </div>

                      {feedback && (
                        <div
                          className={`mt-4 rounded-xl p-4 text-sm leading-7 ${
                            feedback.is_correct
                              ? "bg-teal-50 text-teal-900"
                              : "bg-amber-50 text-amber-900"
                          }`}
                        >
                          <p className="font-bold">
                            {feedback.is_correct
                              ? "إجابة صحيحة."
                              : `الإجابة الصحيحة: ${
                                  question.options[feedback.correct_index]
                                }.`}
                          </p>

                          <p className="mt-1">{feedback.explanation}</p>
                        </div>
                      )}
                    </fieldset>
                  );
                })}
              </div>

              {!submitted && (
                <div className="mt-6">
                  <p className="mb-4 text-sm text-slate-500">
                    أجبتِ عن {answeredCount} من ٥ أسئلة.
                  </p>

                  {attemptStarted && !submitting && (
                    <p className="mb-4 rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                      تم تثبيت إجابات هذه المحاولة بعد بدء الإرسال.
                      إذا تعذّر الاتصال، أعيدي إرسالها من الزر أدناه
                      دون احتساب محاولة إضافية.
                    </p>
                  )}

                  {error && (
                    <p
                      role="alert"
                      className="mb-4 rounded-xl bg-red-50 p-4 text-sm leading-7 text-red-800"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-teal-700 px-7 py-3 font-bold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
                  >
                    {submitting
                      ? "جارٍ التصحيح والحفظ..."
                      : attemptStarted
                        ? "إعادة إرسال نفس المحاولة"
                        : "إرسال الاختبار وعرض النتيجة"}
                  </button>
                </div>
              )}
            </form>

            {result && (
              <section
                role="status"
                aria-live="polite"
                className={`mt-7 rounded-2xl border p-6 ${
                  result.passed
                    ? "border-teal-200 bg-teal-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <p className="text-sm font-bold text-slate-600">
                  نتيجتك في هذه المحاولة
                </p>

                <p className="mt-3 text-5xl font-bold text-[#163553]">
                  {result.score}٪
                </p>

                <h3 className="mt-5 text-xl font-bold text-[#163553]">
                  {result.passed
                    ? "أحسنتِ، اجتزتِ التطبيق الشامل!"
                    : "راجعي الأخطاء وحاولي مجددًا"}
                </h3>

                <p className="mt-3 leading-8 text-slate-600">
                  أجبتِ عن {result.correct_count} من ٥ أسئلة إجابة صحيحة.
                </p>

                <div className="mt-4 rounded-xl bg-white/80 p-4 text-sm leading-7 text-teal-800">
                  تم حفظ درجة هذه المحاولة في حسابك بنجاح.
                </div>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {result.passed
                    ? "مبارك! اجتزتِ الدروس الاثني عشر وأكملتِ المسار التأسيسي. تقدمك ودرجاتك محفوظة في حسابك."
                    : "تحتاجين إلى ٨٠٪ للاجتياز. راجعي تفسير الإجابات ثم حاولي مجددًا. تُحفظ أفضل درجة لك، ولا تُلغى نتيجة اجتياز سابقة."}
                </p>

                {result.passed && (
                  <div className="mt-5 rounded-xl bg-white p-5 text-center">
                    <p className="text-3xl font-bold text-teal-700">
                      ١٠٠٪
                    </p>

                    <p className="mt-2 font-bold leading-8 text-[#163553]">
                      نسبة إكمال المسار
                    </p>

                    <p className="mt-2 font-bold leading-8 text-[#163553]">
                      ١٢ درسًا · ٤ مراحل مكتملة
                    </p>

                    <p className="mt-2 text-sm leading-7 text-slate-500">
                      استمري في المراجعة والتطبيق لتثبيت ما تعلمتِه.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/student"
                    prefetch={false}
                    className="rounded-xl bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800"
                  >
                    العودة إلى رحلتي
                  </Link>

                  <button
                    type="button"
                    onClick={retryQuiz}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
                  >
                    إعادة الاختبار
                  </button>

                  <button
                    type="button"
                    onClick={() => changeTab("explanation")}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
                  >
                    مراجعة الأمثلة
                  </button>
                </div>
              </section>
            )}
          </section>
        )}
      </div>
    </main>
  );
}