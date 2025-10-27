/**
 * Fix and Re-import Parts Data
 * Properly handles CSV parsing with inch marks
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const PARTS_DIRECTORY_ID = '1ttk2hlid22rtA6zcNvN9RrvG24qi-XfiUcdcumafaKo';

// Load credentials
const credentialsPath = path.join(__dirname, '..', 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

async function fixPartsData() {
  try {
    console.log('Fixing Parts data...\n');

    // Read the CSV file
    const csvPath = path.join(__dirname, '..', 'data', 'parts.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');

    // Parse CSV properly with csv-parse library
    const records = parse(csvContent, {
      columns: false,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,  // Allow inconsistent column counts
      escape: '\\',
      quote: '"'
    });

    console.log(`Parsed ${records.length} rows from CSV (including header)`);

    // Remove header row (we already have headers in the sheet)
    const dataRows = records.slice(1);

    console.log(`Found ${dataRows.length} data rows`);

    // First, clear existing data (keep headers)
    console.log('\nClearing existing data...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId: PARTS_DIRECTORY_ID,
      range: 'Parts!A2:P100'
    });

    // Now add the corrected data
    console.log('Adding corrected data...');
    await sheets.spreadsheets.values.update({
      spreadsheetId: PARTS_DIRECTORY_ID,
      range: 'Parts!A2',
      valueInputOption: 'RAW',
      requestBody: { values: dataRows }
    });

    console.log(`\nSuccess! Added ${dataRows.length} parts to the spreadsheet`);
    console.log('\nYou can view the sheet at:');
    console.log(`https://docs.google.com/spreadsheets/d/${PARTS_DIRECTORY_ID}`);

  } catch (error) {
    console.error('\nError:', error.message);
    if (error.errors) {
      console.error('Details:', error.errors);
    }
    process.exit(1);
  }
}

fixPartsData();
