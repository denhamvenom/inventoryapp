/**
 * Updates the Parts sheet headers to use generic Spec 1-4 naming
 * This allows dynamic specification labels per category/subcategory
 */

const { google } = require('googleapis');
const path = require('path');

// Spreadsheet ID for Parts Directory
const PARTS_DIRECTORY_ID = '1ttk2hlid22rtA6zcNvN9RrvG24qi-XfiUcdcumafaKo';

async function updatePartsHeaders() {
  try {
    console.log('Loading Google Sheets API credentials...');

    // Load credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '..', 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    console.log('Reading current Parts sheet headers...');

    // Read current headers
    const currentHeaders = await sheets.spreadsheets.values.get({
      spreadsheetId: PARTS_DIRECTORY_ID,
      range: 'Parts!1:1'
    });

    console.log('Current headers:', currentHeaders.data.values[0].join(', '));

    // Define the new header row
    const newHeaders = [
      'Part ID',
      'Part Name',
      'Category',
      'Subcategory',
      'Spec 1',           // Was "Type"
      'Spec 2',           // Was "Size/Specification 1"
      'Spec 3',           // Was "Specification 2"
      'Spec 4',           // NEW COLUMN
      'Quantity Per',
      'Cost',
      'Supplier',
      'Order Link',
      'Location/Bin',
      'Notes',
      'Status',
      'Date Added',
      'Added By'
    ];

    console.log('Updating headers to:', newHeaders.join(', '));

    // Update the header row
    await sheets.spreadsheets.values.update({
      spreadsheetId: PARTS_DIRECTORY_ID,
      range: 'Parts!A1:Q1',
      valueInputOption: 'RAW',
      resource: {
        values: [newHeaders]
      }
    });

    console.log('Headers updated successfully');

    // Get sheet ID for formatting
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: PARTS_DIRECTORY_ID
    });

    const partsSheet = spreadsheet.data.sheets.find(
      sheet => sheet.properties.title === 'Parts'
    );

    if (!partsSheet) {
      throw new Error('Could not find Parts sheet');
    }

    const sheetId = partsSheet.properties.sheetId;

    console.log('Applying formatting to header row...');

    // Apply formatting to ensure consistency
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: PARTS_DIRECTORY_ID,
      resource: {
        requests: [
          // Format header row
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 17
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 70 / 255,
                    green: 29 / 255,
                    blue: 124 / 255
                  },
                  textFormat: {
                    foregroundColor: {
                      red: 1,
                      green: 1,
                      blue: 1
                    },
                    fontSize: 10,
                    bold: true
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
            }
          }
        ]
      }
    });

    console.log('Formatting applied successfully');
    console.log('');
    console.log('SUCCESS: Parts sheet headers updated');
    console.log('Column E: Type → Spec 1');
    console.log('Column F: Size/Specification 1 → Spec 2');
    console.log('Column G: Specification 2 → Spec 3');
    console.log('Column H: NEW → Spec 4');

  } catch (error) {
    console.error('ERROR updating Parts headers:', error.message);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  updatePartsHeaders()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updatePartsHeaders };
