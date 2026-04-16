import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { records } = body;

    // ✅ Validate input
    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    // ✅ Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key missing on server" },
        { status: 500 }
      );
    }

    // ✅ Prepare clean data
    const dataToScan = records.map((r: { studentPhone: string; studentName: string; schoolEmail: string; schoolName: string; }) => ({
      id: `${r.studentPhone}-${r.studentName}`, // safer unique ID
      name: r.studentName,
      email: r.schoolEmail,
      phone: r.studentPhone,
      school: r.schoolName,
    }));

    const prompt = `
Analyze this JSON array of student event registrations.

Flag any records that look like obvious spam:
- keyboard smashes (asdfghjkl)
- fake phone numbers (1234567890, 0000000000)
- test emails (test@test.com)
- profanity

Return ONLY a valid JSON array of the "id" strings that are spam.
No markdown. No explanation.

Data: ${JSON.stringify(dataToScan)}
`;

    // ✅ Call Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let rawText = "";
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json", // 🔥 forces cleaner JSON
        },
      });
      rawText = result.response.text();
    } catch (e) {
      const error = e as Error;
      console.error("Gemini API error:", error);
      return NextResponse.json(
        { error: error.message || "Gemini API failed" },
        { status: 500 }
      );
    }

    if (!rawText) {
      console.error("Invalid Gemini response: empty text");
      return NextResponse.json(
        { error: "Invalid AI response: empty text" },
        { status: 500 }
      );
    }

    // 🧹 Clean markdown if any
    const cleanJsonString = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // ❌ Safe parse
    let spamIds: string[] = [];

    try {
      const parsed = JSON.parse(cleanJsonString);
      if (Array.isArray(parsed)) {
        spamIds = parsed;
      } else {
        throw new Error("Not an array");
      }
    } catch {
      console.error("JSON parse failed:", cleanJsonString);

      return NextResponse.json(
        { error: "Invalid AI JSON format" },
        { status: 500 }
      );
    }

    // ✅ Attach spam flag
    const updatedRecords = records.map((record: { studentPhone: string; studentName: string; [key: string]: unknown }) => {
      const uniqueId = `${record.studentPhone}-${record.studentName}`;

      return {
        ...record,
        isSpam: spamIds.includes(uniqueId),
      };
    });

    return NextResponse.json({ data: updatedRecords });

  } catch (err) {
    const error = err as Error;
    console.error("AI Spam Scan Error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to process AI scan" },
      { status: 500 }
    );
  }
}
