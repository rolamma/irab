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
    title: "حرف الجر",
    description:
      "حرف يدخل على الاسم ويجعله مجرورًا، ويربط معناه بما قبله.",
    example: "في، من، إلى، على، عن، الباء، الكاف، اللام.",
  },
  {
    title: "الاسم المجرور",
    description: "الاسم الذي يأتي بعد حرف الجر ويكون مجرورًا به.",
    example:
      "في المدرسةِ: المدرسةِ اسم مجرور بحرف الجر «في».",
  },
];

const examples = [
  {
    sentence: "ذهبَ خالدٌ إلى المدرسةِ.",
    preposition: "إلى",
    noun: "المدرسةِ",
    explanation:
      "إلى حرف جر، والمدرسةِ اسم مجرور بإلى، وعلامة جره الكسرة الظاهرة.",
  },
  {
    sentence: "وضعتْ سارةُ الكتابَ على الطاولةِ.",
    preposition: "على",
    noun: "الطاولةِ",
    explanation:
      "على حرف جر، والطاولةِ اسم مجرور بعلى، وعلامة جره الكسرة الظاهرة.",
  },
  {
    sentence: "كتبتْ مريمُ بالقلمِ.",
    preposition: "الباء",
    noun: "القلمِ",
    explanation:
      "الباء حرف جر متصل بالاسم، والقلمِ اسم مجرور بالباء، وعلامة جره الكسرة الظاهرة.",
  },
];

const questions = [
  {
    question: "ما حرف الجر في جملة «ذهبتْ مريمُ إلى المكتبةِ»؟",
    options: ["إلى", "مريمُ", "المكتبةِ"],
  },
  {
    question: "ما الاسم المجرور في جملة «الكتابُ على المكتبِ»؟",
    options: ["الكتابُ", "المكتبِ", "على"],
  },
  {
    question: "ما علامة جر «الحديقةِ» في عبارة «في الحديقةِ»؟",
    options: ["الضمة", "الفتحة", "الكسرة"],
  },
  {
    question: "ما حرف الجر المتصل بالاسم في كلمة «بالقلمِ»؟",
    options: ["الباء", "القاف", "اللام الموجودة في «الـ»"],
  },
  {
    question: "ما إعراب «البيتِ» في جملة «عادَ خالدٌ من البيتِ»؟",
    options: [
      "فاعل مرفوع بالضمة",
      "اسم مجرور بالكسرة",
      "مفعول به منصوب بالفتحة",
    ],
  },
];

const practiceQuestions = [
  {
    sentence: "تجلسُ الطالبةُ في الفصلِ.",
    question: "ما حرف الجر في الجملة؟",
    options: ["في", "الطالبةُ", "الفصلِ"],
    correct: 0,
    explanation: "في حرف جر، والفصلِ اسم مجرور بعده.",
  },
  {
    sentence: "خرجَ الطفلُ من الغرفةِ.",
    question: "ما الاسم المجرور في الجملة؟",
    options: ["الطفلُ", "الغرفةِ", "خرجَ"],
    correct: 1,
    explanation:
      "الغرفةِ اسم مجرور بمن، وعلامة جره الكسرة الظاهرة.",
  },
  {
    sentence: "كتبتْ سارةُ بالقلمِ.",
    question: "ما علامة جر الاسم «القلمِ»؟",
    options: ["الفتحة", "الضمة", "الكسرة"],
    correct: 2,
    explanation:
      "القلمِ اسم مفرد مجرور بالباء، وعلامة جره الكسرة الظاهرة.",
  },
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
    return "لا يمكن إرسال هذا الاختبار قبل اجتياز الدروس السبعة السابقة بنسبة ٨٠٪ على الأقل لكل درس.";
  }

  if (message.includes("INVALID_ANSWERS")) {
    return "تعذّر اعتماد الإجابات. حدّثي الصفحة وأجيبي عن الأسئلة الخمسة.";
  }

  if (message.includes("ATTEMPT_CONFLICT")) {
    return "حدث تعارض في بيانات المحاولة. حدّثي الصفحة قبل المحاولة مجددًا.";
  }

  if (code === "PGRST202") {
    return "دالة حفظ اختبار الدرس الثامن غير متاحة. تأكدي من تنفيذ كود SQL الخاص به.";
  }

  if (code === "42501") {
    return "لا توجد صلاحية لحفظ الاختبار. نحتاج مراجعة صلاحيات دالة الدرس الثامن.";
  }

  return "تعذّر التأكد من حفظ المحاولة. اضغطي إعادة إرسال نفس المحاولة؛ لن تُحسب مرتين.";
}

export default function EighthLessonPage() {
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
        "submit_lesson_eight",
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
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
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-[#163553] transition hover:bg-slate-50"
          >
            العودة إلى رحلتي
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <section>
          <p className="text-sm font-bold text-teal-700">
            مرحلة أساسيات الإعراب · الدرس الثامن
          </p>

          <h1 className="mt-3 text-3xl font-bold leading-normal text-[#163553] sm:text-4xl">
            حروف الجر والاسم المجرور
          </h1>

          <p className="mt-4 leading-8 text-slate-600">
            سنتعرف على بعض حروف الجر، ونحدد الاسم المجرور بعدها،
            ونتعلم جره بالكسرة في الأسماء المفردة الواردة في أمثلتنا.
          </p>

          <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm leading-7 text-teal-800">
            اختبار هذا الدرس مرتبط بحسابك، وتُحفظ نتيجتك بعد الإرسال.
            يتطلب اجتيازه إكمال الدروس السبعة السابقة بنسبة ٨٠٪ على الأقل
            لكل درس.
          </div>
        </section>

        <nav
          aria-label="أقسام الدرس"
          className="my-7 grid grid-cols-3 gap-2 rounded-2xl bg-slate-200/60 p-2"
        >
          {(
            [
              ["explanation", "الشرح"],
              ["practice", "التدريب"],
              ["quiz", "الاختبار"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => changeTab(value)}
              disabled={submitting}
              aria-pressed={tab === value}
              className={`rounded-xl px-2 py-3 font-bold transition disabled:cursor-wait disabled:opacity-60 ${
                tab === value
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-500 hover:bg-white/60"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "explanation" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[#163553]">
              ماذا يحدث للاسم بعد حرف الجر؟
            </h2>

            <p className="mt-4 leading-8 text-slate-600">
              في عبارة «إلى المدرسةِ» نجد حرف الجر «إلى»، ثم الاسم
              «المدرسةِ». دخل حرف الجر على الاسم فجعله مجرورًا،
              وتظهر الكسرة في آخره.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {concepts.map((concept) => (
                <article
                  key={concept.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <h3 className="text-xl font-bold text-teal-700">
                    {concept.title}
                  </h3>

                  <p className="mt-3 leading-8 text-slate-600">
                    {concept.description}
                  </p>

                  <p className="mt-4 border-t border-slate-200 pt-4 font-bold leading-8 text-[#163553]">
                    {concept.example}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-7 rounded-2xl border-r-4 border-teal-600 bg-teal-50 p-6">
              <h3 className="text-xl font-bold text-[#163553]">
                حروف منفصلة وحروف متصلة
              </h3>

              <p className="mt-3 leading-8 text-slate-700">
                تُكتب بعض حروف الجر منفصلة عن الاسم، مثل: «من البيتِ»
                و«إلى المدرسةِ» و«في الفصلِ».
              </p>

              <p className="mt-3 leading-8 text-slate-700">
                وتُكتب حروف أخرى متصلة بالاسم، مثل الباء في
                «بالقلمِ»، والكاف في «كالأسدِ»، واللام في «للطالبِ».
              </p>

              <p className="mt-3 leading-8 text-slate-700">
                اتصال حرف الجر بالاسم في الكتابة لا يجعله جزءًا
                أصليًا منه؛ ففي «بالقلمِ» نميز الباء حرف جر،
                و«القلمِ» اسمًا مجرورًا.
              </p>
            </div>

            <h3 className="mt-8 text-xl font-bold text-[#163553]">
              أمثلة محلولة
            </h3>

            <div className="mt-4 space-y-4">
              {examples.map((example) => (
                <article
                  key={example.sentence}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <p className="text-xl font-bold leading-9 text-[#163553]">
                    {example.sentence}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                      حرف الجر: {example.preposition}
                    </span>

                    <span className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-bold text-teal-700">
                      الاسم المجرور: {example.noun}
                    </span>
                  </div>

                  <p className="mt-4 leading-8 text-slate-600">
                    {example.explanation}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-7 rounded-2xl border-r-4 border-teal-600 bg-teal-50 p-6">
              <h3 className="text-xl font-bold text-[#163553]">
                إعراب حرف الجر والاسم المجرور
              </h3>

              <p className="mt-4 text-2xl font-bold text-[#163553]">
                في الفصلِ.
              </p>

              <ul className="mt-4 space-y-3 leading-8 text-slate-700">
                <li>
                  <strong>في: </strong>
                  حرف جر مبني لا محل له من الإعراب.
                </li>

                <li>
                  <strong>الفصلِ: </strong>
                  اسم مجرور بفي، وعلامة جره الكسرة الظاهرة على آخره.
                </li>
              </ul>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5 leading-8 text-slate-700">
              <strong className="text-[#163553]">
                لا تخلطي بين حرف الجر والاسم المجرور:{" "}
              </strong>
              في «على الطاولةِ» تكون «على» حرف الجر، و«الطاولةِ» هي
              الاسم المجرور. حرف الجر نفسه لا نقول عنه إنه اسم مجرور.
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-5 leading-8 text-slate-700">
              <strong className="text-[#163553]">تذكري: </strong>
              الاسم المجرور يختلف عن المفعول به. في «قرأَ الطالبُ
              القصةَ في المكتبةِ» تكون «القصةَ» مفعولًا به منصوبًا،
              و«المكتبةِ» اسمًا مجرورًا بفي.
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-5 leading-8 text-slate-700">
              <strong className="text-[#163553]">
                نطاق هذا الدرس:{" "}
              </strong>
              نركز على أسماء مفردة تظهر عليها الكسرة. وسنتعرف لاحقًا
              على أسماء لها علامات جر أخرى، وعلى الجر بالإضافة.
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
              حددي حرف الجر والاسم المجرور
            </h2>

            <p className="mt-3 leading-8 text-slate-600">
              اقرئي الجملة وحددي المطلوب. التدريب لا يدخل في درجة
              الاختبار، ويمكنك تغيير إجابتك.
            </p>

            <div className="mt-7 space-y-6">
              {practiceQuestions.map((question, index) => {
                const selected = practiceAnswers[index];
                const hasAnswer = selected !== undefined;
                const correct = selected === question.correct;

                return (
                  <fieldset
                    key={question.sentence}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <legend className="px-2 font-bold leading-8 text-[#163553]">
                      {index + 1}. {question.question}
                    </legend>

                    <p className="mt-2 rounded-xl bg-slate-50 p-4 text-xl font-bold leading-9 text-[#163553]">
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
                          className={`rounded-xl border p-4 font-bold transition ${
                            selected === optionIndex
                              ? "border-teal-600 bg-teal-50 text-teal-800"
                              : "border-slate-200 text-slate-600 hover:border-teal-300"
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
                          correct
                            ? "bg-teal-50 text-teal-800"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {correct
                          ? `إجابة صحيحة. ${question.explanation}`
                          : "حاولي مرة أخرى. ابحثي عن حرف الجر، ثم الاسم الذي دخل عليه، وتذكري أن علامة الجر في أمثلتنا هي الكسرة."}
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
                className="rounded-xl bg-teal-700 px-6 py-3 font-bold text-white transition hover:bg-teal-800"
              >
                انتقلي إلى الاختبار
              </button>

              <button
                type="button"
                onClick={() => changeTab("explanation")}
                className="rounded-xl border border-slate-200 px-6 py-3 font-bold text-[#163553] transition hover:bg-slate-50"
              >
                مراجعة الشرح
              </button>
            </div>
          </section>
        )}

        {tab === "quiz" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[#163553]">
              اختبار حروف الجر والاسم المجرور
            </h2>

            <p className="mt-3 leading-8 text-slate-600">
              الاختبار مكوّن من ٥ أسئلة، لكل سؤال ٢٠ درجة.
              تحتاجين إلى ٨٠٪ على الأقل لاجتياز الدرس وفتح الدرس التالي.
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
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <legend className="px-2 font-bold leading-8 text-[#163553]">
                        {index + 1}. {question.question}
                      </legend>

                      <div className="mt-3 grid gap-3">
                        {question.options.map((option, optionIndex) => {
                          const selected = answers[index] === optionIndex;

                          return (
                            <label
                              key={option}
                              className={`flex items-center gap-3 rounded-xl border p-4 transition ${
                                inputsLocked
                                  ? "cursor-default"
                                  : "cursor-pointer"
                              } ${
                                selected
                                  ? "border-teal-600 bg-teal-50 text-teal-800"
                                  : "border-slate-200 text-slate-700"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${index}`}
                                value={optionIndex}
                                checked={selected}
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

                              <span className="leading-7">{option}</span>
                            </label>
                          );
                        })}
                      </div>

                      {feedback && (
                        <div
                          className={`mt-4 rounded-xl p-4 text-sm leading-7 ${
                            feedback.is_correct
                              ? "bg-teal-50 text-teal-800"
                              : "bg-rose-50 text-rose-800"
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
                <div className="mt-7 rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm leading-7 text-slate-600">
                    أجبتِ عن {answeredCount} من {questions.length} أسئلة.
                  </p>

                  {attemptStarted && !submitting && (
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      تم تثبيت إجابات هذه المحاولة بعد بدء الإرسال.
                      إذا تعذّر الاتصال، أعيدي إرسالها من الزر أدناه
                      دون احتساب محاولة إضافية.
                    </p>
                  )}

                  {error && (
                    <p
                      role="alert"
                      className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-7 text-rose-800"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-5 rounded-xl bg-teal-700 px-6 py-3 font-bold text-white transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
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
                className={`mt-7 rounded-3xl border p-6 sm:p-8 ${
                  result.passed
                    ? "border-teal-200 bg-teal-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <p className="font-bold text-slate-600">
                  نتيجتك في هذه المحاولة
                </p>

                <p className="mt-3 text-5xl font-bold text-[#163553]">
                  {result.score}٪
                </p>

                <h3 className="mt-5 text-2xl font-bold text-[#163553]">
                  {result.passed
                    ? "أحسنتِ، اجتزتِ الاختبار!"
                    : "اقتربتِ من الإتقان، حاولي مرة أخرى!"}
                </h3>

                <p className="mt-4 leading-8 text-slate-600">
                  أجبتِ عن {result.correct_count} من {questions.length} أسئلة
                  إجابة صحيحة.
                  {result.passed
                    ? " حققتِ نسبة الإتقان المطلوبة لهذا الدرس."
                    : " تحتاجين إلى ٨٠٪ على الأقل لاجتياز الدرس."}
                </p>

                <div className="mt-5 rounded-2xl bg-white/80 p-4 text-sm leading-7 text-teal-800">
                  تم حفظ درجة هذه المحاولة في حسابك بنجاح.
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {result.passed
                    ? "ارجعي إلى رحلتك؛ أصبح الدرس التاسع متاحًا لك."
                    : "راجعي التصحيح والشرح، ثم أعيدي الاختبار. تُحفظ أفضل درجة لك، ولا تُلغى نتيجة اجتياز سابقة."}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/student"
                    prefetch={false}
                    className="rounded-xl bg-teal-700 px-5 py-3 font-bold text-white transition hover:bg-teal-800"
                  >
                    العودة إلى رحلتي
                  </Link>

                  <button
                    type="button"
                    onClick={retryQuiz}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-[#163553] transition hover:bg-slate-50"
                  >
                    إعادة الاختبار
                  </button>

                  <button
                    type="button"
                    onClick={() => changeTab("explanation")}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-[#163553] transition hover:bg-slate-50"
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