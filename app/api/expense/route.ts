import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) {
    return NextResponse.json(
      { error: "APPS_SCRIPT_URL no configurada" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Apps Script redirects once; follow it
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`Apps Script respondió ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
