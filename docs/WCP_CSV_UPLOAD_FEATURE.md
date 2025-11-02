# WCP CSV Upload Feature

## Overview

The WCP CSV Upload Feature allows team members to quickly submit bulk orders by uploading a CSV file exported directly from West Coast Products (WCP). This feature streamlines the ordering process for large parts lists, eliminating the need to manually select each part through the shopping cart interface.

### Key Benefits
- Fast bulk ordering from WCP catalogs
- No shopping cart required
- No justification required for CSV orders
- Automatic file storage in Google Drive
- Direct link to CSV file in Orders sheet for review

## User Workflow

### Step-by-Step Process

1. **Access the Form**
   - Navigate to the Denham Venom Parts Management System
   - Select your Subteam from the dropdown
   - Select your Name from the student list

2. **Switch to CSV Upload Mode**
   - Click the "Order by WCP CSV" button in the tab navigation
   - The CSV Upload section will appear

3. **Upload the CSV File**
   - Click "Choose File" or "Browse" button
   - Select the WCP-exported CSV file from your computer
   - File must be in .csv format (10MB maximum size)

4. **Select Order Priority**
   - Choose from:
     - High: Needed immediately
     - Medium: Needed within a week
     - Low: Needed when available

5. **Add Notes (Optional)**
   - Enter any special instructions or context for the order
   - Default note includes original filename if left blank

6. **Submit Order**
   - Click "Upload and Submit Order"
   - Confirm the submission in the dialog box
   - Wait for upload and processing to complete
   - Receive order confirmation with Order Number

## Technical Implementation

### Backend Changes (Code.js)

#### New Function 1: createWCPOrdersFolder()
```javascript
/**
 * Creates or retrieves the WCP Orders folder in Google Drive
 * @returns {string} Folder ID
 */
function createWCPOrdersFolder()
```

**Purpose**: Ensures a dedicated Google Drive folder exists for storing WCP CSV uploads

**Behavior**:
- Checks if "WCP Orders" folder already exists in Drive
- If exists: Returns existing folder ID
- If not exists: Creates new folder with "Anyone with link can view" sharing
- Returns folder ID for subsequent file uploads

**Error Handling**: Throws error if folder creation fails

---

#### New Function 2: uploadCSVToDrive()
```javascript
/**
 * Uploads a CSV file to the WCP Orders folder in Google Drive
 * @param {string} fileContent - Base64-encoded or plain text CSV content
 * @param {string} fileName - Original filename from user
 * @param {string} orderNumber - Order number for filename
 * @returns {Object} Result object with success status and file info
 */
function uploadCSVToDrive(fileContent, fileName, orderNumber)
```

**Purpose**: Uploads the CSV file to Google Drive and generates shareable link

**Parameters**:
- `fileContent`: File data (base64-encoded from browser FileReader)
- `fileName`: Original filename for reference
- `orderNumber`: Used to create standardized filename

**Process**:
1. Calls `createWCPOrdersFolder()` to get/create folder
2. Decodes base64 file content to CSV text
3. Creates file with standardized name: `WCP_Order_ORD-YYYYMMDD-XXX.csv`
4. Sets file sharing to "Anyone with link can view"
5. Returns file ID, URL, and standardized filename

**Return Object**:
```javascript
{
  success: true,
  fileId: "1abc...",
  fileUrl: "https://drive.google.com/file/d/1abc.../view",
  fileName: "WCP_Order_ORD-20251031-001.csv"
}
```

**Error Handling**: Returns `{success: false, message: "error details"}` on failure

---

#### Modified Function 3: submitOrder()
```javascript
/**
 * Submits a new parts order
 * @param {Object} orderData - Object containing order details
 * @returns {Object} Success status and order number
 */
function submitOrder(orderData)
```

**Updates for CSV Support**:

1. **CSV Order Detection**:
   ```javascript
   const isCSVOrder = orderData.csvFileLink ? true : false;
   ```

2. **Conditional Validation**:
   - CSV orders: Require studentName and csvFileLink
   - Regular orders: Require studentName and items array

3. **CSV Order Row Format** (15 columns):
   ```javascript
   [
     orderNumber,              // "ORD-20251031-001"
     timestamp,                // Date object
     studentName,              // "John Doe"
     'CSV-ORDER',              // Special Part ID for CSV orders
     'WCP CSV Order',          // Part Name
     'WCP Import',             // Category
     1,                        // Quantity (always 1 for CSV orders)
     priority,                 // "High", "Medium", or "Low"
     'CSV order - no justification',  // Auto-generated justification
     0,                        // Unit Cost (0 for CSV orders)
     0,                        // Total Cost (0 for CSV orders)
     'Pending',                // Status
     notes,                    // User notes or filename
     '',                       // Monday ID (populated by Zapier)
     orderData.csvFileLink     // Google Drive file URL (Column O)
   ]
   ```

4. **Inventory Skip**:
   - CSV orders do NOT update inventory quantities
   - Inventory will be updated manually after order is processed

### Frontend Changes (WebApp.html)

#### UI Section: CSV Upload Form

**Location**: Lines 646-701

**HTML Structure**:
```html
<div id="csvUploadSection" style="display: none;">
  <h3>Order Parts by WCP CSV Upload</h3>

  <div class="info-box">
    <!-- Instructions for users -->
  </div>

  <div class="form-group">
    <label for="csvFileInput">Select WCP CSV File *</label>
    <input type="file" id="csvFileInput" accept=".csv">
  </div>

  <div class="form-group">
    <label for="csvOrderPriority">Priority *</label>
    <select id="csvOrderPriority">
      <option value="High">High - Needed immediately</option>
      <option value="Medium">Medium - Needed within a week</option>
      <option value="Low">Low - Needed when available</option>
    </select>
  </div>

  <div class="form-group">
    <label for="csvOrderNotes">Notes (Optional)</label>
    <textarea id="csvOrderNotes"></textarea>
  </div>

  <button onclick="submitCSVOrder()">Upload and Submit Order</button>
</div>
```

---

#### JavaScript Function 1: showCSVUpload()
```javascript
/**
 * Shows the CSV upload mode
 */
function showCSVUpload()
```

**Purpose**: Switches the interface to CSV upload mode

**Actions**:
- Hides browse inventory section
- Hides custom request section
- Shows CSV upload section
- Updates button styling (makes CSV button primary, others secondary)

---

#### JavaScript Function 2: submitCSVOrder()
```javascript
/**
 * Submits a CSV order
 */
function submitCSVOrder()
```

**Purpose**: Handles the complete CSV order submission process

**Validation Steps**:
1. Check subteam selected
2. Check student name selected
3. Check CSV file selected
4. Check priority selected

**Process Flow**:
1. Display confirmation dialog with filename
2. Show loading indicator: "Uploading CSV file..."
3. Read file using FileReader (converts to base64)
4. Call `uploadCSVToDrive()` server function
5. Wait for upload result
6. Show loading indicator: "Submitting order..."
7. Call `submitOrder()` with orderData containing csvFileLink
8. Display success/error message
9. Clear form on success

**OrderData Structure for CSV Upload**:
```javascript
{
  studentName: "John Doe",
  csvFileLink: "https://drive.google.com/file/d/...",
  csvFileName: "WCP_Order_ORD-20251031-001.csv",
  priority: "Medium",
  notes: "Optional user notes or 'WCP CSV Order: original_file.csv'",
  items: []  // Empty array for CSV orders
}
```

---

#### JavaScript Function 3: formatFileSize() (Helper)
```javascript
/**
 * Formats file size in human-readable format
 */
function formatFileSize(bytes)
```

**Purpose**: Converts bytes to KB or MB for display (not currently used but available for file preview)

### Google Sheets Changes

#### Orders Sheet - New Column O

**Column Name**: CSV File Link

**Purpose**: Stores Google Drive URL to uploaded CSV file

**Data Type**: URL/Text

**Values**:
- CSV orders: `https://drive.google.com/file/d/1abc.../view`
- Regular orders: Empty string

**Usage**: Team leaders click link to view original WCP CSV for order verification

**Manual Setup Required**: Yes - see Manual Setup Required section below

### Google Drive Integration

#### Folder Structure
```
Google Drive (Root)
└── WCP Orders/
    ├── WCP_Order_ORD-20251031-001.csv
    ├── WCP_Order_ORD-20251031-002.csv
    └── WCP_Order_ORD-20251101-001.csv
```

**Folder Name**: WCP Orders

**Location**: Root of Apps Script service account's Drive

**Permissions**: Anyone with link can view

**File Naming Convention**: `WCP_Order_{ORDER_NUMBER}.csv`

**File Sharing**: Each file set to "Anyone with link can view" for easy team leader access

## User Instructions

### How to Upload a WCP CSV

1. **Export from WCP Website**:
   - Browse WCP catalog and add items to cart
   - Export cart as CSV file
   - Save file to your computer

2. **Access Parts System**:
   - Open Denham Venom Parts Management System
   - Select your Subteam
   - Select your Name

3. **Switch to CSV Mode**:
   - Click "Order by WCP CSV" button
   - CSV upload form appears

4. **Upload File**:
   - Click file input to browse
   - Select your WCP CSV file
   - File should be .csv format only

5. **Complete Form**:
   - Select Priority level
   - Add optional notes for team leaders

6. **Submit**:
   - Click "Upload and Submit Order"
   - Confirm in dialog box
   - Wait for confirmation message with Order Number

7. **Verification**:
   - Order appears in Orders sheet with "CSV-ORDER" as Part ID
   - CSV File Link column contains link to uploaded file
   - Team leaders will review and process

### File Requirements

**Format**: CSV only (.csv extension)

**Size Limit**: 10MB maximum (Google Apps Script file upload limit)

**Source**: West Coast Products export (recommended)

**Content**: Any valid CSV structure will be accepted and stored

**Validation**: No content validation performed - file stored as-is for manual review

## Troubleshooting

### Common Issues and Solutions

#### "Please select a CSV file to upload"
**Cause**: No file selected in file input

**Solution**: Click the file input button and select a valid .csv file

---

#### "File upload failed"
**Cause**: Google Drive API error, network issue, or file too large

**Solutions**:
- Check file size is under 10MB
- Verify internet connection
- Try uploading again
- Contact system administrator if problem persists

---

#### "Failed to submit order"
**Cause**: Orders sheet unavailable or permission error

**Solutions**:
- Check spreadsheet permissions
- Verify Orders sheet exists
- Contact system administrator

---

#### CSV file not appearing in Drive folder
**Cause**: Drive folder creation failed or permissions issue

**Solutions**:
- Check if "WCP Orders" folder exists in Drive
- Verify service account has Drive access
- Manually create "WCP Orders" folder if needed
- Contact system administrator

---

#### Order shows $0.00 cost
**Behavior**: This is expected for CSV orders

**Explanation**: CSV orders record $0.00 cost because actual pricing is determined when processing the CSV file manually

---

#### Monday.com not receiving CSV orders
**Cause**: Zapier integration may need updating for CSV order format

**Solution**: Update Zapier workflow to recognize "CSV-ORDER" Part ID and handle csvFileLink field

## Manual Setup Required

### Add Column O to Orders Sheet

Before deploying this feature, manually add the CSV File Link column:

1. **Open Orders Spreadsheet**:
   - Navigate to Denham Venom Parts Orders spreadsheet
   - Open the "Orders" sheet tab

2. **Locate Column O**:
   - Column O should be immediately after Monday ID column (Column N)
   - If Column O already exists, verify it's labeled "CSV File Link"

3. **Add Header**:
   - In cell O1, enter: `CSV File Link`
   - Format header to match other column headers (bold, background color)

4. **Verify Column Order**:
   ```
   A: Order Number
   B: Date
   C: Student Name
   D: Part ID
   E: Part Name
   F: Category
   G: Quantity Requested
   H: Priority
   I: Justification
   J: Unit Cost
   K: Total Cost
   L: Status
   M: Notes
   N: Monday ID
   O: CSV File Link  ← NEW COLUMN
   ```

5. **Apply Formula (Optional)**:
   - If you want clickable links, use: `=HYPERLINK(O2, "View CSV")`
   - Or leave as plain URL for automatic link detection

### Update Zapier Integration (If Using Monday.com)

The Zapier workflow may need updates to handle CSV orders:

1. **Add Trigger Filter**:
   - Filter to ignore or handle "CSV-ORDER" Part IDs specially
   - CSV orders may not need Monday.com items created

2. **Map CSV File Link**:
   - Add mapping for Column O (CSV File Link)
   - Create custom field in Monday.com for CSV link if desired

3. **Handle $0 Costs**:
   - CSV orders will have $0 Unit Cost and Total Cost
   - Configure Monday.com workflow accordingly

## Security Considerations

### File Access

- All uploaded CSV files are set to "Anyone with link can view"
- Links are only shared in Orders sheet (access-controlled Google Sheet)
- No public directory listing of CSV files
- File URLs are long and non-guessable

### Data Privacy

- CSV files may contain sensitive supplier pricing
- Only team leaders should access Orders sheet
- Consider restricting Drive folder access if needed

### File Validation

- No virus scanning performed on uploads
- No content validation of CSV data
- Trust-based system - users expected to upload valid WCP exports only

## Integration Points

### Monday.com via Zapier

**Current Behavior**: All Orders sheet rows trigger Zapier automation

**CSV Order Impact**:
- CSV orders appear as single row with Part ID "CSV-ORDER"
- May need special handling in Zapier workflow
- Column O provides link back to original CSV

**Recommended Zapier Updates**:
1. Add filter: If Part ID = "CSV-ORDER" → Use special workflow
2. Map CSV File Link field to Monday.com custom field
3. Create notification task for team leaders to review CSV

### Inventory Management

**Important**: CSV uploads do NOT update inventory quantities

**Reason**: CSV contents need manual review before inventory adjustment

**Process**: Team leaders must:
1. Review CSV file via link in Orders sheet
2. Process order through WCP
3. Manually update inventory when parts arrive

## Future Enhancements

### Potential Improvements

1. **CSV Parsing and Preview**
   - Parse CSV on upload
   - Show preview of parts before submission
   - Extract total cost from CSV content

2. **File Validation**
   - Verify CSV format before upload
   - Check for required columns
   - Validate WCP product codes

3. **Auto-Inventory Update**
   - Parse CSV to extract product codes and quantities
   - Match against Parts Directory
   - Update inventory automatically

4. **Batch Processing**
   - Allow multiple CSV uploads in one session
   - Combine multiple CSV files into single order

5. **Email Notifications**
   - Auto-email team leaders when CSV order submitted
   - Include link to CSV file in email

6. **CSV Order History**
   - Dedicated tab showing only CSV orders
   - Quick access to all uploaded files
   - Processing status tracking

## Version History

**v1.0.0** - 2025-10-31
- Initial release of WCP CSV Upload feature
- Google Drive integration
- Orders sheet Column O support
- Modified submitOrder() function
- Frontend UI with CSV upload mode

## Support

For issues or questions about WCP CSV uploads:

1. Check this documentation
2. Verify file format is .csv
3. Confirm Orders sheet has Column O added
4. Check Google Drive for "WCP Orders" folder
5. Review system logs for error details
6. Contact system administrator

## Related Documentation

- **WCP_IMPORT_GUIDE.md**: Information about bulk WCP parts import to Parts Directory
- **TESTING_CSV_UPLOAD.md**: Testing procedures for CSV upload feature
- **DEPLOYMENT_READY.md**: Deployment instructions and checklist
