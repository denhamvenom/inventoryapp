/**
 * Adds the Product Code column to the Parts sheet
 * Inserts column after Subcategory, before Spec 1
 */

const { google } = require('googleapis');
const path = require('path');

// Load credentials
const credentialsPath = path.join(__dirname, '..', 'credentials.json');
const credentials = require(credentialsPath);

// Spreadsheet ID
const PARTS_DIRECTORY_ID = '1ttk2hlid22rtA6zcNvN9RrvG24qi-XfiUcdcumafaKo';
const PARTS_SHEET_NAME = 'Parts';

async function addProductCodeColumn() {
  try {
    console.log('Loading Google Sheets API credentials...');

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get the sheet ID
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: PARTS_DIRECTORY_ID,
    });

    const partsSheet = spreadsheet.data.sheets.find(
      sheet => sheet.properties.title === PARTS_SHEET_NAME
    );

    if (!partsSheet) {
      throw new Error(`Sheet "${PARTS_SHEET_NAME}" not found`);
    }

    const sheetId = partsSheet.properties.sheetId;

    console.log(`Found sheet "${PARTS_SHEET_NAME}" with ID: ${sheetId}`);

    // Insert column at position 5 (after Subcategory, before Spec 1)
    // Columns: A=Part ID, B=Part Name, C=Category, D=Subcategory, E=NEW, F=Spec 1...
    console.log('Inserting Product Code column at position E (column 5)...');

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: PARTS_DIRECTORY_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                startIndex: 4, // Insert at column E (0-based index 4)
                endIndex: 5
              }
            }
          }
        ]
      }
    });

    console.log('Column inserted successfully');

    // Update the header for the new column
    console.log('Setting column header to "Product Code"...');

    await sheets.spreadsheets.values.update({
      spreadsheetId: PARTS_DIRECTORY_ID,
      range: `${PARTS_SHEET_NAME}!E1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Product Code']]
      }
    });

    console.log('Header set successfully');
    console.log('\nSUCCESS: Product Code column added to Parts sheet');
    console.log('Column position: E (after Subcategory, before Spec 1)');

  } catch (error) {
    console.error('ERROR adding Product Code column:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the function
addProductCodeColumn();
