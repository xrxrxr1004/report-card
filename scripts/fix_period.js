const { google } = require("googleapis");
require("dotenv").config({ path: ".env.local" });

const SPREADSHEET_ID = "19BkUNdxQ8NksgrYsbLzID-Rv6B14R8TRdQ26E6uNhig";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n") : null;

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "내신기출성적!A:N",
  });

  const rows = response.data.values;
  console.log("현재 데이터 행 수:", rows.length);

  const updatedRows = rows.map((row, index) => {
    if (index === 0) return row;
    if (row[3] === "2024-2학기") {
      row[3] = "2025-1학기";
    }
    return row;
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "내신기출성적!A1",
    valueInputOption: "RAW",
    requestBody: {
      values: updatedRows
    }
  });

  console.log("✅ 기간 수정 완료: 2024-2학기 → 2025-1학기");
}

main().catch(console.error);
