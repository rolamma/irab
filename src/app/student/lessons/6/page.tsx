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

const concepts = [
  {
    title: "الفعل",
    description: "كلمة تدل على حدث مرتبط بزمن.",
    example: "كتبَ الطالبُ.",
    explanation: "كتبَ: فعل ماضٍ يدل على حدوث الكتابة.",
  },
  {
    title: "الفاعل",
    description: "اسم مرفوع يدل على من قام بالفعل أو اتصف به.",
    example: "كتبَ الطالبُ.",
    explanation: "الطالبُ: فاعل؛ لأنه هو الذي قام بالكتابة.",
  },
];

const examples = [
  {
    sentence: "شرحَ المعلمُ.",
    verb: "شرحَ",
    subject: "المعلمُ",
    explanation: "من الذي شرح؟ المعلمُ؛ إذن المعلمُ هو الفاعل.",
  },
  {
    sentence: "تقرأُ الطالبةُ.",
    verb: "تقرأُ",
    subject: "الطالبةُ",
    explanation: "من التي تقرأ؟ الطالبةُ؛ إذن الطالبةُ هي الفاعل.",
  },
  {
    sentence: "طلعَ القمرُ.",
    verb: "طلعَ",
    subject: "القمرُ",
    explanation: "ما الذي طلع؟ القمرُ؛ إذن القمرُ هو الفاعل.",
  },
];

// التصحيح والإجابات الصحيحة للاختبار في قاعدة البيانات.
const questions = [
  {
    question: "ما الفعل في جملة «قرأَ خالدٌ القصةَ»؟",
    options: ["قرأَ", "خالدٌ", "القصةَ"],
  },
  {
    question: "ما الفاعل في جملة «تكتبُ الطالبةُ الواجبَ»؟",
    options: ["تكتبُ", "الطالبةُ", "الواجبَ"],
  },
  {
    question: "ما الحالة الإعرابية للفاعل؟",
    options: ["منصوب", "مجرور", "مرفوع"],
  },
  {
    question: "ما الفاعل في جملة «طلعَ القمرُ»؟",
    options: ["القمرُ", "طلعَ", "لا يوجد فاعل"],
  },
  {
    question: "ما إعراب «المعلمُ» في جملة «حضرَ المعلمُ»؟",
    options: ["مبتدأ مرفوع", "فاعل مرفوع بالضمة", "اسم مجرور"],
  },
];

// التدريب للتعلم فقط، ولا يدخل ضمن درجة الاختبار.
const practiceQuestions = [
  {
    sentence: "ركضَ الطفلُ.",
    question: "ما الفعل في الجملة؟",
    options: ["ركضَ", "الطفلُ", "لا يوجد فعل"],
    correct: 0,
    explanation:
      "ركضَ فعل ماضٍ يدل على حدث الركض، والطفلُ هو الفاعل.",
  },
  {
    sentence: "تشرحُ المعلمةُ الدرسَ.",
    question: "ما الفاعل في الجملة؟",
    options: ["تشرحُ", "المعلمةُ", "الدرسَ"],
    correct: 1,
    explanation: "المعلمةُ هي التي تقوم بالشرح، فهي الفاعل.",
  },
  {
    sentence: "نامَ الطفلُ.",
    question: "ما علامة رفع الفاعل «الطفلُ»؟",
    options: ["الفتحة", "الكسرة", "الضمة"],
    correct: 2,
    explanation: "الطفلُ فاعل مرفوع بالضمة؛ لأنه اسم مفرد.",
  },
];

const tabs: { id: Tab; label: string }[] = [
  { id: "explanation", label: "١. الشرح والأمثلة" },
  { id: "practice", label: "٢. التدريب" },
  { id: "quiz", label: "٣. اختبار الدرس" },
];

function isQuizResult(value: unknown): value is QuizResult {
  if (!value || typeof value !== "object") return false;

  const result = value as Partial<QuizResult>;

  return (
    typeof result.attempt_id === "string" &&
    typeof result.score === "number" &&
    [0, 20, 40, 60, 80, 100].includes(result.score) &&
    typeof result.correct_count === "number" &&
    Number.isInteger(result.correct_count) &&
    result.correct_count >= 0 &&
    result.correct_count <= 5 &&
    result.score === result.correct_count * 20 &&
    typeof result.passed === "boolean" &&
    result.passed === (result.score >= 80) &&
    Array.isArray(result.feedback) &&
    result.feedback.length === questions.length &&
    result.feedback.every(
      (item) =>
        item &&
        Number.isInteger(item.correct_index) &&
        item.correct_index >= 0 &&
        item.correct_index <= 2 &&
        typeof item.is_correct === "boolean" &&
        typeof item.explanation === "string"
    )
  );
}

function submissionErrorMessage(code: string, message: string) {
  if (message.includes("AUTH_REQUIRED")) {
    return "انتهت جلسة الدخول. سجّلي الدخول مجددًا ثم حاولي.";
  }

  if (message.includes("STUDENT_REQUIRED")) {
    return "إرسال الاختبار متاح لحساب الطالبة فقط.";
  }

  if (message.includes("PREVIOUS_LESSON_REQUIRED")) {
    return "لا يمكن إرسال اختبار الدرس السادس قبل اجتياز الدروس الخمسة السابقة بنسبة ٨٠٪ وحفظ نتائجها في حسابك.";
  }

  if (message.includes("INVALID_ANSWERS")) {
    return "تعذّر التحقق من الإجابات. اختاري إجابة لكل سؤال.";
  }

  if (message.includes("ATTEMPT_CONFLICT")) {
    return "تعذّر مطابقة المحاولة. حدّثي الصفحة ثم أعيدي الاختبار.";
  }

  if (code === "PGRST202") {
    return "دالة تصحيح الدرس السادس غير متاحة. نحتاج التأكد من تنفيذ كود Supabase.";
  }

  if (code === "42501") {
    return "تعذّر حفظ المحاولة بسبب الصلاحيات. نحتاج مراجعة إعدادات Supabase.";
  }

  return "لم نتأكد من اكتمال حفظ المحاولة. أعيدي إرسال نفس المحاولة بالزر أدناه.";
}

export default function SixthLessonPage() {
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

  const answeredCount = questions.filter((question, index) => {
    const answer = answers[index];

    return (
      Number.isInteger(answer) &&
      answer >= 0 &&
      answer < question.options.length
    );
  }).length;

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
          "تعذّر التحقق من تسجيل الدخول. تأكدي من الاتصال، أو سجّلي الدخول مجددًا."
        );
        return;
      }

      if (
        pendingAttempt.current &&
        pendingAttempt.current.userId !== user.id
      ) {
        setError(
          "تغيّر الحساب أثناء المحاولة. حدّثي الصفحة قبل بدء اختبار بالحساب الجديد."
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

      const { data, error: rpcError } = await supabase.rpc(
        "submit_lesson_six",
        {
          p_answers: attempt.answers,
          p_attempt_id: attempt.id,
        }
      );

      if (rpcError) {
        setError(
          submissionErrorMessage(rpcError.code, rpcError.message)
        );
        return;
      }

      if (!isQuizResult(data) || data.attempt_id !== attempt.id) {
        setError(
          "وصل رد غير متوقع. أعيدي إرسال نفس المحاولة للتحقق من النتيجة."
        );
        return;
      }

      setResult(data);
    } catch {
      setError(
        "تعثّر الاتصال ولم نتأكد من اكتمال الحفظ. تأكدي من الإنترنت ثم أعيدي إرسال نفس المحاولة."
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
        <div className="mb-7 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm leading-7 text-teal-900">
          اختبار هذا الدرس مرتبط بحسابك. تُصحّح الإجابات وتُحفظ الدرجة
          في قاعدة البيانات، ويشترط اجتياز الدروس الخمسة السابقة بنسبة
          ٨٠٪ لقبول المحاولة. ربط النتائج بلوحة المعلمة لم يكتمل بعد.
        </div>

        <section className="mb-8">
          <p className="text-sm font-bold text-teal-700">
            مرحلة بناء الجملة · الدرس السادس
          </p>

          <h1 className="mt-3 text-3xl leading-normal font-bold text-[#163553] sm:text-4xl">
            الفعل والفاعل
          </h1>

          <p className="mt-4 leading-8 text-slate-500">
            سنتعلم تحديد الفعل والفاعل في جمل فعلية بسيطة، ونتعرف
            على رفع الفاعل بالضمة عندما يكون اسمًا مفردًا.
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
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-60 ${
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
              ما الحدث؟ ومن قام به؟
            </h2>

            <p className="mt-4 leading-8 text-slate-600">
              في الجملة «كتبَ الطالبُ» يدل الفعل «كتبَ» على الحدث،
              ويبين الاسم «الطالبُ» من قام به. لذلك نسمي «الطالبُ»
              فاعلًا.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {concepts.map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <h3 className="text-xl font-bold text-teal-700">
                    {item.title}
                  </h3>

                  <p className="mt-3 leading-8 text-slate-600">
                    {item.description}
                  </p>

                  <p className="mt-4 border-t border-slate-200 pt-4 text-xl leading-loose font-bold text-[#163553]">
                    {item.example}
                  </p>

                  <p className="mt-3 leading-8 text-slate-600">
                    {item.explanation}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-7 rounded-2xl border-r-4 border-teal-600 bg-teal-50 p-6">
              <h3 className="font-bold text-teal-800">
                كيف أحدد الفاعل؟
              </h3>

              <ol className="mt-4 list-inside list-decimal space-y-3 leading-8 text-slate-700">
                <li>أقرأ الجملة وأحدد الفعل.</li>
                <li>
                  أسأل: من الذي قام بالفعل؟ أو ما الذي اتصف به؟
                </li>
                <li>أحدد الاسم الذي تجيب به الجملة عن السؤال.</li>
                <li>
                  أتحقق من المعنى، ولا أعتمد على ترتيب الكلمات وحده.
                </li>
              </ol>
            </div>

            <h3 className="mt-8 text-xl font-bold text-[#163553]">
              أمثلة محلولة
            </h3>

            <div className="mt-4 space-y-4">
              {examples.map((item) => (
                <article
                  key={item.sentence}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <p className="text-xl leading-loose font-bold text-[#163553]">
                    {item.sentence}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                      الفعل: {item.verb}
                    </span>

                    <span className="rounded-lg bg-teal-50 px-3 py-2 text-teal-800">
                      الفاعل: {item.subject}
                    </span>
                  </div>

                  <p className="mt-3 leading-8 text-slate-600">
                    {item.explanation}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-7 rounded-2xl border-r-4 border-teal-600 bg-teal-50 p-6">
              <h3 className="text-xl font-bold text-[#163553]">
                إعراب الفاعل
              </h3>

              <p className="mt-4 leading-8 text-slate-600">
                الفاعل مرفوع. وإذا كان اسمًا مفردًا كما في أمثلتنا،
                فعلامة رفعه الضمة الظاهرة على آخره.
              </p>

              <p className="mt-4 text-2xl leading-loose font-bold text-[#163553]">
                حضرَ المعلمُ.
              </p>

              <ul className="mt-4 space-y-3 leading-8 text-slate-700">
                <li>
                  <strong>حضرَ:</strong> فعل ماضٍ مبني على الفتح.
                </li>
                <li>
                  <strong>المعلمُ:</strong> فاعل مرفوع، وعلامة رفعه
                  الضمة الظاهرة على آخره.
                </li>
              </ul>
            </div>

            <div className="mt-6 rounded-xl bg-slate-100 p-5 leading-8 text-slate-600">
              <strong className="text-[#163553]">انتبهي: </strong>
              الفاعل ليس بالضرورة إنسانًا؛ فقد يكون حيوانًا، مثل
              «طارَ العصفورُ»، أو غير ذلك، مثل «طلعَ القمرُ».
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-5 leading-8 text-slate-600">
              <strong className="text-[#163553]">
                لا تخلطي بين المبتدأ والفاعل:
              </strong>{" "}
              في «يكتبُ الطالبُ» تكون «الطالبُ» فاعلًا. أما في
              «الطالبُ يكتبُ» فتكون «الطالبُ» مبتدأ، وفاعل «يكتبُ»
              ضميرًا مستترًا تقديره «هو» يعود على الطالب.
              وسنتوسع في الضمائر لاحقًا.
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 p-5 leading-8 text-slate-600">
              <strong className="text-[#163553]">
                نركز في هذا الدرس على:
              </strong>{" "}
              الجمل التي يظهر فيها الفاعل اسمًا واضحًا بعد الفعل،
              مثل «قرأَ خالدٌ» و«تكتبُ الطالبةُ».
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
              حددي الفعل والفاعل
            </h2>

            <p className="mt-3 leading-8 text-slate-500">
              اقرئي الجملة وحددي المطلوب. التدريب لا يدخل في درجة
              الاختبار، ويمكنك تغيير إجابتك.
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
                    <legend className="px-2 font-bold text-[#163553]">
                      {question.question}
                    </legend>

                    <p className="mt-2 rounded-xl bg-slate-50 p-4 text-xl leading-8 text-[#163553]">
                      {question.sentence}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                          className={`rounded-xl border px-4 py-3 font-bold transition ${
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
                          : "حاولي مرة أخرى. حددي الحدث أولًا، ثم اسألي من قام به، وتذكري أن الفاعل المفرد في أمثلتنا مرفوع بالضمة."}
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
                انتقلي إلى الاختبار
              </button>

              <button
                type="button"
                onClick={() => changeTab("explanation")}
                className="rounded-xl border border-slate-200 px-6 py-3 font-bold text-slate-600 hover:bg-slate-50"
              >
                راجعي الشرح
              </button>
            </div>
          </section>
        )}

        {tab === "quiz" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[#163553]">
              اختبار الفعل والفاعل
            </h2>

            <p className="mt-3 leading-8 text-slate-500">
              خمسة أسئلة، لكل سؤال ٢٠ درجة. تحتاجين أربع إجابات صحيحة
              لتحقيق نسبة الإتقان المطلوبة: ٨٠٪.
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
                      <legend className="px-2 leading-8 font-bold text-[#163553]">
                        {index + 1}. {question.question}
                      </legend>

                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {question.options.map((option, optionIndex) => (
                          <label
                            key={option}
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm leading-7 ${
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

                            {option}
                          </label>
                        ))}
                      </div>

                      {feedback && (
                        <p
                          className={`mt-4 rounded-xl p-4 text-sm leading-7 ${
                            feedback.is_correct
                              ? "bg-teal-50 text-teal-900"
                              : "bg-amber-50 text-amber-900"
                          }`}
                        >
                          <strong>
                            {feedback.is_correct
                              ? "إجابة صحيحة. "
                              : `الإجابة الصحيحة: ${
                                  question.options[
                                    feedback.correct_index
                                  ]
                                }. `}
                          </strong>

                          {feedback.explanation}
                        </p>
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
                    <p className="mb-4 text-sm leading-7 text-slate-500">
                      ثبّتنا إجابات هذه المحاولة. إعادة الإرسال تستخدم
                      نفس رقم المحاولة لتجنب حفظها مرتين.
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
                    ? "أحسنتِ، اجتزتِ الدرس السادس!"
                    : "راجعي الأخطاء وحاولي مجددًا"}
                </h3>

                <p className="mt-3 leading-8 text-slate-600">
                  أجبتِ عن {result.correct_count} من ٥ أسئلة إجابة صحيحة.
                </p>

                <p className="mt-4 rounded-xl bg-white/70 p-4 text-sm leading-7 text-teal-900">
                  تم حفظ درجة هذه المحاولة في حسابك بنجاح.
                </p>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {result.passed
                    ? "عودي إلى رحلتك؛ ستظهر مرحلة بناء الجملة مكتملة ويصبح الدرس السابع متاحًا."
                    : "تحتاجين إلى ٨٠٪ للاجتياز. المحاولة الأقل لا تلغي اجتيازًا سابقًا محفوظًا."}
                </p>

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
                    مراجعة الشرح
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