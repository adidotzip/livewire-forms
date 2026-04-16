import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // ✅ Validate request body
    if (
      !body?.schoolName ||
      !body?.schoolEmail ||
      !body?.students ||
      !Array.isArray(body.students)
    ) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const scriptUrl = process.env.NEXT_PUBLIC_SCRIPT_URL;

    if (!scriptUrl) {
      console.error("NEXT_PUBLIC_SCRIPT_URL is missing");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Default value (important if AI fails)
    body.isSpam = false;

    // ✅ AI Spam Detection
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json", // 🔥 forces cleaner JSON
          },
        });

        const prompt = `
Analyze the following event registration data.

Return ONLY a valid JSON object:
{ "isSpam": true/false }

Mark as spam if:
- keyboard smash (asdfgh)
- fake names (test, John Doe)
- fake school names
- obvious junk data

Otherwise return false.

Data:
School Name: ${body.schoolName}
School Email: ${body.schoolEmail}
Students: ${JSON.stringify(
          body.students.map((s: { name: string; class: string }) => ({
            name: s.name,
            class: s.class,
          }))
        )}
`;

        const aiResponse = await model.generateContent(prompt);

        const text = aiResponse?.response?.text();

        if (text) {
          // 🧹 Clean response
          const clean = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

          try {
            const parsed = JSON.parse(clean);

            if (typeof parsed?.isSpam === "boolean") {
              body.isSpam = parsed.isSpam;
            } else {
              throw new Error("Invalid JSON shape");
            }
          } catch {
            console.error("AI JSON parse failed:", clean);
          }
        } else {
          console.error("Empty AI response");
        }
      } catch (aiError) {
        console.error("AI Spam Detection error:", aiError);
        // 💡 Don't block user if AI fails
      }
    }

    // ✅ Send to Apps Script
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Apps Script error:", errText);

      return NextResponse.json(
        { error: "Failed to save data" },
        { status: 500 }
      );
    }

    // ✅ Parse response safely
    let responseData;

    try {
      responseData = await response.json();
    } catch {
      console.warn("Non-JSON response from Apps Script");
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
