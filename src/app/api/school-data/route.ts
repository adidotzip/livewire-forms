import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.schoolName || !body?.schoolEmail) {
      return NextResponse.json(
        { error: "School Name and Email are required" },
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

    // Fetch data from the Google Apps Script backend
    const response = await fetch(scriptUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Apps Script responded with status: ${response.status}`);
    }

    const rawData = await response.json();
    let dataArray = [];

    // Depending on the Google Apps Script response format, extract the array
    if (Array.isArray(rawData)) {
      dataArray = rawData;
    } else if (rawData.data && Array.isArray(rawData.data)) {
      dataArray = rawData.data;
    } else {
      console.warn("Unexpected data format from Apps Script:", rawData);
      return NextResponse.json([]); // Return empty if format is unrecognized
    }

    // Filter by schoolName and schoolEmail (case-insensitive)
    const filteredData = dataArray.filter(
      (item: Record<string, unknown>) =>
        typeof item.schoolName === "string" && typeof item.schoolEmail === "string" &&
        item.schoolName.toLowerCase() === body.schoolName.toLowerCase() &&
        item.schoolEmail.toLowerCase() === body.schoolEmail.toLowerCase()
    );

    return NextResponse.json(filteredData);
  } catch (error) {
    console.error("Error fetching school data:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
