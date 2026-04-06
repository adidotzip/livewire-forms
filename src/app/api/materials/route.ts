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

  const scriptUrl = process.env.NEXT_PUBLIC_MATERIALS_SCRIPT_URL;

  if (!scriptUrl) {
    return NextResponse.json({ error: "Materials script URL not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(scriptUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
    });

    if (!response.ok) {
      throw new Error(`Materials script responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching materials data:", error);
    return NextResponse.json({ error: "Failed to fetch materials data" }, { status: 500 });
  }
}