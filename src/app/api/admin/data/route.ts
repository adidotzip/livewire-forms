import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuth } from "@/lib/auth";

export async function GET() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("admin_session")?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyAuth(sessionToken);

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scriptUrl = process.env.NEXT_PUBLIC_SCRIPT_URL;

  if (!scriptUrl) {
    return NextResponse.json({ error: "Script URL not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(scriptUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      // Cache controls to ensure fresh data
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Apps Script responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching admin data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
