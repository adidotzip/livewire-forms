// This file is meant to be copied and pasted into a Google Apps Script project.
// Go to script.google.com, create a new project, and paste this code.
// Deploy it as a Web App, allowing access to "Anyone".

const SHEET_NAME = "Materials";

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Setup headers
    sheet.appendRow([
      "Date",
      "Drive",
      "School",
      "Event"
    ]);
    // Make headers bold
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Handle POST requests (Materials submissions)
function doPost(e) {
  try {
    const sheet = getSheet();

    // Parse the incoming JSON body
    const body = JSON.parse(e.postData.contents);
    const date = body.date;
    const drive = body.drive;
    const school = body.school;
    const event = body.event;

    // Create row data
    const row = [
      new Date().toISOString(),
      drive,
      school,
      event
    ];

    // Append row
    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (Admin fetching materials data)
function doGet(e) {
  try {
    const sheet = getSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    // If only headers exist or sheet is empty
    if (values.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Get headers
    const headers = values[0];

    // Convert rows to JSON objects
    const jsonData = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const obj = {
        date: row[0],
        drive: row[1],
        school: row[2],
        event: row[3]
      };
      jsonData.push(obj);
    }

    return ContentService.createTextOutput(JSON.stringify(jsonData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}