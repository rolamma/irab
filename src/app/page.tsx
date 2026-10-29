"use client";

import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

function authErrorMessage(code?: string) {
  switch (code) {
    case "invalid_credentials":
      return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    case "email_not_confirmed":
      return "أكّدي بريدك الإلكتروني من الرسالة المرسلة لك، ثم سجّلي الدخول.";
    case "user_already_exists":
    case "email_exists":
      return "تعذّر إنشاء الحساب. إذا عندك حساب بهذا البريد، سجّلي الدخول.";
    case "weak_password":
      return "كلمة المرور ضعيفة. اختاري كلمة مرور أقوى.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "وصلتِ للحد المسموح من المحاولات. انتظري قليلًا وحاولي مرة ثانية.";
    case "email_address_invalid":
      return "تأكدي من كتابة بريد إلكتروني صحيح.";
    case "email_address_not_authorized":
      return "إرسال البريد لهذا العنوان غير متاح بإعدادات البريد الحالية. نحتاج إعداد خدمة البريد في Supabase.";
    case "signup_disabled":
      return "إنشاء الحسابات غير مفعّل حاليًا.";
    default:
      return "تعذّر إتمام العملية. تأكدي من الاتصال وإعدادات Supabase، ثم حاولي مرة ثانية.";
  }
}

export default function Home() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">(
    "error"
  );
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);

  const isRegister = mode === "register";

  function changeMode(nextMode: "login" | "register") {
    if (submitting.current) return;

    setMode(nextMode);
    setMessage("");
    setShowPassword(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting.current) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(
      formData.get("confirmPassword") ?? ""
    );
    const fullName = String(formData.get("fullName") ?? "").trim();
    const grade = String(formData.get("grade") ?? "");
    const section = String(formData.get("section") ?? "").trim();

    setMessage("");
    setMessageType("error");

    if (isRegister) {
      if (!fullName || !section) {
        setMessage("اكتبي الاسم الكامل والشعبة.");
        return;
      }

      if (!["middle-1", "middle-2", "middle-3"].includes(grade)) {
        setMessage("اختاري الصف الدراسي.");
        return;
      }

      if (password.length < 8) {
        setMessage("كلمة المرور لازم تكون ٨ أحرف على الأقل.");
        return;
      }

      if (password !== confirmPassword) {
        setMessage("كلمتا المرور غير متطابقتين.");
        return;
      }
    }

    submitting.current = true;
    setLoading(true);

    try {
      const supabase = createClient();

      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: fullName,
              grade,
              section,
            },
          },
        });

        if (error) {
          setMessage(authErrorMessage(error.code));
          return;
        }

        // إذا كانت الجلسة متاحة مباشرة، ندخل الطالبة.
        if (data.session) {
          window.location.assign("/student");
          return;
        }

        form.reset();
        setShowPassword(false);
        setMessageType("success");
        setMessage(
          "إذا كان البريد متاحًا للتسجيل، ستصلك رسالة تأكيد. افتحي الرابط من نفس المتصفح على جهازك، ثم سجّلي الدخول. إذا عندك حساب سابق، استخدمي تسجيل الدخول."
        );
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(authErrorMessage(error.code));
        return;
      }

      if (!data.user) {
        setMessage("تعذّر التحقق من الحساب. حاولي مرة ثانية.");
        return;
      }

      // نقرأ الصلاحية من الجدول المحمي، وليس من بيانات النموذج.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setMessage(
          "تم التحقق من بيانات الدخول، لكن تعذّر تحميل ملف الحساب. نحتاج مراجعة جدول profiles وصلاحياته."
        );
        return;
      }

      if (profile.role === "teacher") {
        window.location.assign("/teacher");
      } else if (profile.role === "student") {
        window.location.assign("/student");
      } else {
        await supabase.auth.signOut();
        setMessage("صلاحية الحساب غير صالحة. تواصلي مع مسؤولة الموقع.");
      }
    } catch {
      setMessage(
        "تعذّر الاتصال. تأكدي من الإنترنت وبيانات ملف .env.local، ثم حاولي مرة ثانية."
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10 disabled:opacity-60";

  return (
    <main
      dir="rtl"
      lang="ar"
      className="min-h-screen bg-[#f4f7fa] text-slate-900"
      style={{ fontFamily: "Tahoma, Arial, sans-serif" }}
    >
      <header className="border-b border-slate-200 bg-white">
        <div
          dir="rtl"
          className="flex w-full items-center justify-between gap-4 px-5 py-5 sm:px-8"
        >
          <div className="flex items-center gap-3 text-right">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#163553] shadow-md shadow-slate-200"
            >
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#99f6e4"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 6.5C9 4.5 5.5 4.5 2 5.5v14c3.5-1 7-1 10 1" />
                <path d="M12 6.5c3-2 6.5-2 10-1v14c-3.5-1-7-1-10 1" />
                <path d="M12 6.5v14" />
                <path d="M5.5 9h3M5.5 12h3M15.5 9h3M15.5 12h3" />
              </svg>
            </span>

            <div className="text-right">
              <p className="text-2xl font-bold leading-normal text-[#163553]">
                إعراب
              </p>
              <p className="mt-1 text-sm text-slate-500">
                من التأسيس إلى الإتقان
              </p>
            </div>
          </div>

          <span className="hidden text-sm text-slate-500 sm:block">
            مساحة تعلم النحو والإعراب
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-12 lg:min-h-[calc(100vh-105px)] lg:grid-cols-2 lg:py-16">
        <section className="max-w-lg">
          <span className="inline-block rounded-full bg-teal-100 px-4 py-2 text-sm font-bold text-teal-800">
            رحلتك تبدأ بفهم الأساس
          </span>

          <h1 className="mt-6 text-4xl leading-[1.6] font-bold text-[#163553] sm:text-5xl">
            افهمي القاعدة،
            <br />
            وأتقني الإعراب.
          </h1>

          <p className="mt-5 text-lg leading-9 text-slate-600">
            دروس متدرجة، وأمثلة واضحة، وتدريبات تساعدك على التعلم خطوة
            بخطوة، مع متابعة معلمتك لتقدمك.
          </p>

          <div className="mt-9 grid grid-cols-3 gap-3">
            {[
              { value: "١٢", label: "درسًا تعليميًا" },
              { value: "٤", label: "مراحل متدرجة" },
              { value: "٨٠٪", label: "لاجتياز الدرس" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-5 text-center"
              >
                <p className="text-3xl font-bold text-teal-700">
                  {item.value}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-7 border-r-4 border-teal-600 pr-4">
            <p className="leading-8 text-slate-600">
              تعلّمي في البيت، وسلّمي واجباتك، وراجعي ما تعلمتِه مع معلمتك
              داخل الحصة.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="auth-title"
          className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-9"
        >
          <div className="mb-7 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
            <button
              type="button"
              disabled={loading}
              aria-pressed={!isRegister}
              onClick={() => changeMode("login")}
              className={`rounded-xl px-3 py-3 font-bold transition disabled:opacity-60 ${
                !isRegister
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              تسجيل الدخول
            </button>

            <button
              type="button"
              disabled={loading}
              aria-pressed={isRegister}
              onClick={() => changeMode("register")}
              className={`rounded-xl px-3 py-3 font-bold transition disabled:opacity-60 ${
                isRegister
                  ? "bg-white text-teal-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              إنشاء حساب
            </button>
          </div>

          <h2
            id="auth-title"
            className="text-2xl font-bold text-[#163553]"
          >
            {isRegister ? "ابدئي رحلتك معنا" : "أهلًا بعودتك"}
          </h2>

          <p className="mt-2 mb-7 leading-7 text-slate-500">
            {isRegister
              ? "أنشئي حسابك للوصول إلى الدروس ومتابعة تقدمك."
              : "سجّلي دخولك لمتابعة رحلتك التعليمية."}
          </p>

          <form
            key={mode}
            onSubmit={handleSubmit}
            onChange={() => {
              if (!loading) setMessage("");
            }}
            aria-busy={loading}
            className="space-y-5"
          >
            <fieldset disabled={loading} className="space-y-5">
              {isRegister && (
                <>
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-2 block text-sm font-bold"
                    >
                      الاسم الكامل
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="اكتبي اسمك الكامل"
                      required
                      maxLength={100}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="grade"
                        className="mb-2 block text-sm font-bold"
                      >
                        الصف الدراسي
                      </label>
                      <select
                        id="grade"
                        name="grade"
                        required
                        defaultValue=""
                        className={inputClass}
                      >
                        <option value="" disabled>
                          اختاري الصف
                        </option>
                        <option value="middle-1">الأول متوسط</option>
                        <option value="middle-2">الثاني متوسط</option>
                        <option value="middle-3">الثالث متوسط</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="section"
                        className="mb-2 block text-sm font-bold"
                      >
                        الشعبة
                      </label>
                      <input
                        id="section"
                        name="section"
                        type="text"
                        placeholder="مثال: ١"
                        required
                        maxLength={20}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-bold"
                >
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  dir="ltr"
                  placeholder="name@example.com"
                  required
                  maxLength={254}
                  className={inputClass}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-bold">
                    كلمة المرور
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-controls={
                      isRegister ? "password confirmPassword" : "password"
                    }
                    aria-pressed={showPassword}
                    className="text-sm font-bold text-teal-700"
                  >
                    {showPassword ? "إخفاء" : "إظهار"}
                  </button>
                </div>

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  dir="ltr"
                  required
                  minLength={isRegister ? 8 : undefined}
                  aria-describedby={isRegister ? "password-help" : undefined}
                  className={inputClass}
                />

                {isRegister && (
                  <p
                    id="password-help"
                    className="mt-2 text-sm text-slate-500"
                  >
                    اختاري كلمة مرور من ٨ أحرف على الأقل.
                  </p>
                )}
              </div>

              {isRegister && (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-bold"
                  >
                    تأكيد كلمة المرور
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    dir="ltr"
                    required
                    minLength={8}
                    className={inputClass}
                  />
                </div>
              )}
            </fieldset>

            {message && (
              <p
                role="status"
                aria-live="polite"
                className={`rounded-xl border p-4 text-sm leading-7 ${
                  messageType === "success"
                    ? "border-teal-200 bg-teal-50 text-teal-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal-700 px-5 py-3.5 font-bold text-white transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 disabled:cursor-wait disabled:opacity-60"
            >
              {loading
                ? isRegister
                  ? "جارٍ إنشاء الحساب..."
                  : "جارٍ تسجيل الدخول..."
                : isRegister
                  ? "إنشاء حساب"
                  : "تسجيل الدخول"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm leading-7 text-slate-500">
            {isRegister ? "عندك حساب بالفعل؟" : "ما عندك حساب؟"}{" "}
            <button
              type="button"
              disabled={loading}
              onClick={() => changeMode(isRegister ? "login" : "register")}
              className="font-bold text-teal-700 disabled:opacity-60"
            >
              {isRegister ? "سجّلي دخولك" : "أنشئي حسابًا"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}