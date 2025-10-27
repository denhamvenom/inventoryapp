/**
 * Test Google Sheets API Authentication
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function testAuth() {
  try {
    console.log('Loading credentials...');
    const credentialsPath = path.join(__dirname, '..', 'credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    console.log('Service Account Email:', credentials.client_email);
    console.log('Project ID:', credentials.project_id);

    console.log('\nInitializing Google Auth...');
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    console.log('Getting auth client...');
    const authClient = await auth.getClient();

    console.log('Initializing Sheets API...');
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    console.log('\nAttempting to create a test spreadsheet...');
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: 'Test Spreadsheet - Delete Me'
        }
      }
    });

    console.log('\nSUCCESS!');
    console.log('Created test spreadsheet:', response.data.spreadsheetId);
    console.log('URL:', `https://docs.google.com/spreadsheets/d/${response.data.spreadsheetId}`);
    console.log('\nYou can now delete this test spreadsheet.');

  } catch (error) {
    console.error('\nERROR:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.errors) {
      console.error('Details:', JSON.stringify(error.errors, null, 2));
    }
  }
}

testAuth();
