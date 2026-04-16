import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

    // AI Spam Detection
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
          Analyze the following event registration data and determine if it is spam, test data, or junk.
          Return a JSON object with a single boolean field "isSpam".
          Return true if it looks like random keystrokes, obvious fake names (e.g. "test", "asdf", "John Doe"), or fake school names.
          Return false if it looks like a legitimate registration for a high school/college event in India.

          Data:
          School Name: ${body.schoolName}
          School Email: ${body.schoolEmail}
          Students: ${JSON.stringify(body.students.map((s: { name: string, class: string }) => ({ name: s.name, class: s.class })))}
        `;

        const aiResponse = await model.generateContent(prompt);
        const text = aiResponse.response.text();

        // Try to parse the JSON response from the model
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          if (result.isSpam) {
            return NextResponse.json(
              { error: "Registration rejected due to invalid or suspicious data." },
              { status: 400 }
            );
          }
        }
      } catch (aiError) {
        console.error("AI Spam Detection error:", aiError);
        // Continue processing if AI fails, rather than blocking legitimate registrations
      }
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
