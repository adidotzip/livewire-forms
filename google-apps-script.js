// This file is meant to be copied and pasted into a Google Apps Script project.
// Go to script.google.com, create a new project, and paste this code.
// Deploy it as a Web App, allowing access to "Anyone".

const SHEET_NAME = "Registrations";

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Setup headers
    sheet.appendRow([
      "Timestamp",
      "School Name",
      "School Email",
      "Student Name",
      "Student Email",
      "Event"
    ]);
    // Make headers bold
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Handle POST requests (Form submissions)
function doPost(e) {
  try {
    const sheet = getSheet();

    // Parse the incoming JSON body
    const body = JSON.parse(e.postData.contents);
    const schoolName = body.schoolName;
    const schoolEmail = body.schoolEmail;
    const students = body.students;

    // Process each student
    const rows = students.map(student => [
      new Date().toISOString(),
      schoolName,
      schoolEmail,
      student.name,
      student.email,
      student.event
    ]);

    // Append all rows efficiently
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle GET requests (Admin fetching data)
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
        timestamp: row[0],
        schoolName: row[1],
        schoolEmail: row[2],
        studentName: row[3],
        studentEmail: row[4],
        event: row[5]
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
