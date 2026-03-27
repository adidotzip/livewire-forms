import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    if (!body.schoolName || !body.schoolEmail || !body.students || !Array.isArray(body.students)) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const scriptUrl = process.env.NEXT_PUBLIC_SCRIPT_URL;

    if (!scriptUrl) {
      console.error("NEXT_PUBLIC_SCRIPT_URL is not defined in environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Forward the payload to the Google Apps Script endpoint
    const response = await fetch(scriptUrl, {
      method: "POST",
      // Apps script sometimes handles content types differently depending on setup,
      // but standard application/json with JSON.stringify works with doPost(e) getting postData.contents
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Apps Script responded with status: ${response.status}`);
    }

    // If possible, parse the JSON response from Apps Script
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      // Some Apps Script setups return plain text or HTML instead of JSON if not properly configured.
      console.warn("Could not parse Apps Script response as JSON");
      responseData = { success: true };
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Error in /api/register:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
