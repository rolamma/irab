import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(
        new URL("/", request.url)
      );

      response.headers.set("Cache-Control", "private, no-store");

      return response;
    }
  }

  return new NextResponse(
    "تعذّر إكمال تأكيد الدخول. قد يكون الرابط منتهيًا أو فُتح في متصفح مختلف. ارجعي للموقع وحاولي تسجيل الدخول؛ إذا كان البريد مؤكّدًا ستتمكنين من الدخول.",
    {
      status: 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    }
  );
}