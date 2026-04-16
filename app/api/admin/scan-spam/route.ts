import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { records } = await request.json();
    

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }


    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key missing on server" }, { status: 500 });
    }


    const dataToScan = records.map(r => ({
      id: r.studentPhone + r.studentName, // Create a temporary unique ID
      name: r.studentName,
      email: r.schoolEmail,
      phone: r.studentPhone,
      school: r.schoolName
    }));

    const prompt = `
      Analyze this JSON array of student event registrations. 
      Flag any records that look like obvious spam (e.g., keyboard smashes like "asdfghjkl", 
      fake phone numbers like "1234567890" or "0000000000", test emails like "test@test.com", or profanity).
      
      Return ONLY a valid JSON array of the "id" strings that you consider to be spam. Do not return markdown blocks, just the JSON array.
      
      Data: ${JSON.stringify(dataToScan)}
    `;


    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.1, 
        }
      })
    });

    const aiResult = await geminiResponse.json();
    

    const rawText = aiResult.candidates[0].content.parts[0].text;
    const cleanJsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const spamIds: string[] = JSON.parse(cleanJsonString);


    const updatedRecords = records.map(record => {
      const uniqueId = record.studentPhone + record.studentName;
      return {
        ...record,
        isSpam: spamIds.includes(uniqueId)
      };
    });

    return NextResponse.json({ data: updatedRecords });

  } catch (error) {
    console.error("AI Spam Scan Error:", error);
    return NextResponse.json({ error: "Failed to process AI scan" }, { status: 500 });
  }
}
