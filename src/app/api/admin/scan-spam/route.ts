import { NextResponse } from "next/server";

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
    const dataToScan = records.map((r: any) => ({
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
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json", // 🔥 forces cleaner JSON
          },
        }),
      }
    );

    // ❌ Handle API failure
    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", errText);

      return NextResponse.json(
        { error: "Gemini API failed" },
        { status: 500 }
      );
    }

    const aiResult = await geminiResponse.json();

    // ❌ Safe extraction
    const rawText =
      aiResult?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error("Invalid Gemini response:", aiResult);

      return NextResponse.json(
        { error: "Invalid AI response" },
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
    } catch (e) {
      console.error("JSON parse failed:", cleanJsonString);

      return NextResponse.json(
        { error: "Invalid AI JSON format" },
        { status: 500 }
      );
    }

    // ✅ Attach spam flag
    const updatedRecords = records.map((record: any) => {
      const uniqueId = `${record.studentPhone}-${record.studentName}`;

      return {
        ...record,
        isSpam: spamIds.includes(uniqueId),
      };
    });

    return NextResponse.json({ data: updatedRecords });

  } catch (error) {
    console.error("AI Spam Scan Error:", error);

    return NextResponse.json(
      { error: "Failed to process AI scan" },
      { status: 500 }
    );
  }
}
