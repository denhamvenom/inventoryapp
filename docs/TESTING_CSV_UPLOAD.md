# WCP CSV Upload Testing Checklist

## Pre-Deployment Tests

Complete these tests before deploying the WCP CSV Upload feature to production.

### Backend Validation

#### Test 1: createWCPOrdersFolder() Function
- [ ] **First Run**: Call function when folder does not exist
  - Expected: Creates "WCP Orders" folder in Drive
  - Expected: Returns folder ID string
  - Expected: Folder has "Anyone with link can view" permissions

- [ ] **Subsequent Runs**: Call function when folder already exists
  - Expected: Returns existing folder ID
  - Expected: Does not create duplicate folder
  - Expected: No errors thrown

- [ ] **Error Handling**: Test with invalid Drive permissions
  - Expected: Throws error with descriptive message
  - Expected: Error logged to Apps Script logs

**How to Test**:
```javascript
// In Apps Script Editor
function testCreateFolder() {
  try {
    const folderId = createWCPOrdersFolder();
    Logger.log('Folder ID: ' + folderId);

    // Verify folder exists
    const folder = DriveApp.getFolderById(folderId);
    Logger.log('Folder Name: ' + folder.getName());
    Logger.log('Folder URL: ' + folder.getUrl());
  } catch (error) {
    Logger.log('Error: ' + error.message);
  }
}
```

---

#### Test 2: uploadCSVToDrive() Function
- [ ] **Valid Upload**: Upload with base64-encoded CSV content
  - Input: Base64 CSV data, "test.csv", "ORD-20251031-001"
  - Expected: File created in WCP Orders folder
  - Expected: Filename is "WCP_Order_ORD-20251031-001.csv"
  - Expected: Returns success: true, fileId, fileUrl, fileName
  - Expected: File has "Anyone with link can view" permissions

- [ ] **Plain Text Upload**: Upload with plain CSV text (no base64)
  - Input: Plain CSV string, "test2.csv", "ORD-20251031-002"
  - Expected: File created successfully
  - Expected: Content matches input

- [ ] **Large File**: Upload 5MB CSV file
  - Expected: Upload succeeds
  - Expected: No timeout errors

- [ ] **Error Case**: Simulate Drive quota exceeded
  - Expected: Returns success: false with error message
  - Expected: Error logged to Apps Script logs

**How to Test**:
```javascript
// In Apps Script Editor
function testUploadCSV() {
  const testCSV = 'Name,Quantity,Price\nTest Part,10,$5.99';
  const base64 = 'data:text/csv;base64,' + Utilities.base64Encode(testCSV);

  const result = uploadCSVToDrive(base64, 'test.csv', 'ORD-TEST-001');

  Logger.log('Success: ' + result.success);
  Logger.log('File URL: ' + result.fileUrl);

  // Verify file contents
  if (result.success) {
    const file = DriveApp.getFileById(result.fileId);
    Logger.log('File Content: ' + file.getBlob().getDataAsString());
  }
}
```

---

#### Test 3: submitOrder() with CSV Data
- [ ] **CSV Order Submission**: Submit order with csvFileLink
  - Input:
    ```javascript
    {
      studentName: 'Test Student',
      csvFileLink: 'https://drive.google.com/file/d/12345/view',
      csvFileName: 'WCP_Order_TEST.csv',
      priority: 'Medium',
      notes: 'Test CSV order',
      items: []
    }
    ```
  - Expected: Creates 1 row in Orders sheet
  - Expected: Part ID is "CSV-ORDER"
  - Expected: Part Name is "WCP CSV Order"
  - Expected: Category is "WCP Import"
  - Expected: Quantity is 1
  - Expected: Justification is "CSV order - no justification"
  - Expected: Unit Cost is 0
  - Expected: Total Cost is 0
  - Expected: Column O contains csvFileLink
  - Expected: Does NOT call updateInventoryQuantities()

- [ ] **Regular Order (No Regression)**: Submit normal order without csvFileLink
  - Input: Standard orderData with items array
  - Expected: Creates multiple rows (one per item)
  - Expected: Column O is empty
  - Expected: Updates inventory quantities
  - Expected: Normal justification preserved

**How to Test**:
```javascript
// In Apps Script Editor
function testSubmitCSVOrder() {
  const orderData = {
    studentName: 'Test Student',
    csvFileLink: 'https://drive.google.com/file/d/TEST123/view',
    csvFileName: 'WCP_Order_TEST.csv',
    priority: 'High',
    notes: 'Testing CSV upload',
    items: []
  };

  const result = submitOrder(orderData);

  Logger.log('Success: ' + result.success);
  Logger.log('Order Number: ' + result.orderNumber);

  // Manually verify Orders sheet has correct data in new row
}
```

---

### Frontend Validation

#### Test 4: showCSVUpload() Function
- [ ] **Mode Switch**: Click "Order by WCP CSV" button
  - Expected: browseInventorySection becomes hidden
  - Expected: customRequestSection becomes hidden
  - Expected: csvUploadSection becomes visible
  - Expected: csvModeBtn has "button-primary" class
  - Expected: browseModeBtn has "button-secondary" class
  - Expected: customModeBtn has "button-secondary" class

- [ ] **Back to Browse Mode**: Click "Browse Inventory" after CSV mode active
  - Expected: CSV section hidden
  - Expected: Browse section visible
  - Expected: Button states update correctly

**How to Test**: Manual testing in browser

---

#### Test 5: File Input Validation
- [ ] **No File Selected**: Click submit without selecting file
  - Expected: Alert: "Please select a CSV file to upload"
  - Expected: No upload attempted

- [ ] **Valid CSV File**: Select .csv file
  - Expected: File input shows filename
  - Expected: Ready to submit

- [ ] **Non-CSV File**: Try to select .txt or .xlsx file
  - Expected: File input filter should prevent selection (accept=".csv")
  - Note: User can still force wrong type - backend handles this

**How to Test**: Manual testing in browser

---

#### Test 6: submitCSVOrder() Full Flow
- [ ] **Happy Path**: Complete valid CSV order
  - Select subteam
  - Select student name
  - Select CSV file (under 1MB for test)
  - Select priority
  - Add optional notes
  - Click submit
  - Confirm dialog
  - Expected: Loading indicator shows "Uploading CSV file..."
  - Expected: Upload completes
  - Expected: Loading indicator shows "Submitting order..."
  - Expected: Success alert with order number
  - Expected: Form clears (file input, priority, notes)
  - Expected: New row appears in Orders sheet

- [ ] **Cancel Submit**: Click cancel in confirmation dialog
  - Expected: No upload occurs
  - Expected: Form remains filled
  - Expected: No alert shown

- [ ] **Missing Subteam**: Try submit without selecting subteam
  - Expected: Alert: "Please select your subteam"

- [ ] **Missing Student**: Try submit without selecting student
  - Expected: Alert: "Please select your name"

- [ ] **Missing Priority**: Try submit without selecting priority
  - Expected: Alert: "Please select a priority level"

**How to Test**: Manual end-to-end testing in browser

---

## Manual Testing Steps

### Test 1: Valid CSV Upload (Happy Path)

**Objective**: Verify complete workflow from file selection to Orders sheet entry

**Prerequisites**:
- Column O "CSV File Link" added to Orders sheet
- Access to test CSV file
- Web app deployed and accessible

**Steps**:
1. Open Parts Management System web app
2. Select Subteam: "Programming"
3. Select Name: (any test student)
4. Click "Order by WCP CSV" button
5. Verify CSV upload section appears
6. Click file input and select test CSV file
7. Select Priority: "Medium"
8. Enter Notes: "Testing CSV upload feature"
9. Click "Upload and Submit Order"
10. Click "OK" in confirmation dialog
11. Wait for upload progress
12. Wait for order submission
13. Verify success message with order number

**Expected Results**:
- Success alert appears with order number
- File input clears
- Priority resets to default
- Notes field clears
- Orders sheet has new row:
  - Part ID: "CSV-ORDER"
  - Part Name: "WCP CSV Order"
  - Category: "WCP Import"
  - Quantity: 1
  - Justification: "CSV order - no justification"
  - Unit Cost: 0
  - Total Cost: 0
  - Column O: Contains Google Drive link
- Clicking Column O link opens uploaded CSV file
- File in Drive folder named "WCP_Order_[ORDER-NUMBER].csv"

---

### Test 2: File Validation

**Objective**: Verify proper handling of invalid file selections

**Test 2a: Wrong File Type**
1. Navigate to CSV upload section
2. Attempt to select .xlsx Excel file
3. Expected: File dialog may filter out non-CSV files
4. If able to select: Verify graceful error handling

**Test 2b: No File Selected**
1. Navigate to CSV upload section
2. Fill in all fields EXCEPT file selection
3. Click "Upload and Submit Order"
4. Expected: Alert "Please select a CSV file to upload"

**Test 2c: Large File (Edge Case)**
1. Create or obtain 8MB CSV file
2. Select file in upload form
3. Submit order
4. Expected: Upload succeeds (under 10MB limit)
5. Verify file appears in Drive

---

### Test 3: Missing Required Fields

**Objective**: Verify validation for all required fields

**Test 3a: Missing Subteam**
1. Do NOT select subteam
2. Select student name (should be disabled)
3. Select CSV file
4. Select priority
5. Click submit
6. Expected: Alert "Please select your subteam"

**Test 3b: Missing Student Name**
1. Select subteam
2. Do NOT select student name
3. Select CSV file
4. Select priority
5. Click submit
6. Expected: Alert "Please select your name"

**Test 3c: Missing Priority**
1. Select subteam and student
2. Select CSV file
3. Do NOT select priority
4. Click submit
5. Expected: Alert "Please select a priority level"

---

### Test 4: End-to-End Flow

**Objective**: Complete realistic CSV order from start to finish

**Scenario**: Student needs to order parts from WCP catalog

**Steps**:
1. Student browses WCP website and exports cart as CSV
2. Student opens Parts Management System
3. Student selects their subteam
4. Student selects their name
5. Student clicks "Order by WCP CSV"
6. Student uploads the exported WCP CSV file
7. Student selects Priority: "High"
8. Student adds notes: "Parts for drivetrain prototype"
9. Student clicks submit and confirms
10. System uploads file to Drive
11. System creates order in Orders sheet
12. Student receives confirmation with order number
13. Team leader opens Orders sheet
14. Team leader clicks CSV File Link in Column O
15. Team leader reviews parts list in CSV
16. Team leader processes order through WCP
17. Team leader updates order Status to "Ordered"

**Expected Results**:
- Entire workflow completes without errors
- CSV file accessible to team leader
- Order tracked in Orders sheet
- Monday.com receives notification (if Zapier configured)

---

## Post-Deployment Verification

After deploying to production, verify:

### Checklist

- [ ] **Orders Sheet Column O Exists**
  - Column header is "CSV File Link"
  - Column is in correct position (after Monday ID)
  - Column formatting matches other columns

- [ ] **Drive Folder Created**
  - "WCP Orders" folder exists in Drive
  - Folder has correct sharing permissions
  - Folder is accessible via service account

- [ ] **Web App Loads**
  - No JavaScript errors in browser console
  - All three mode buttons visible
  - CSV upload section hidden by default

- [ ] **First CSV Upload**
  - Complete real CSV upload with test file
  - Verify file appears in Drive
  - Verify order appears in Orders sheet
  - Verify CSV link is clickable

- [ ] **Monday.com Integration**
  - Check if Zapier triggered for CSV order
  - Verify Monday.com handling of CSV-ORDER Part ID
  - Update Zapier workflow if needed

- [ ] **User Permissions**
  - Test with actual student account
  - Verify students can upload files
  - Verify team leaders can access Drive folder

---

## Troubleshooting Test Failures

### Upload Fails with "Permission Denied"
**Cause**: Service account lacks Drive access

**Fix**:
1. Check Apps Script advanced services
2. Enable Google Drive API
3. Verify OAuth scopes include Drive access

---

### Column O Link Not Working
**Cause**: Column not created or wrong format

**Fix**:
1. Verify Column O exists in Orders sheet
2. Check cell format is "Plain text" or "Automatic"
3. Ensure URL is complete (starts with https://)

---

### File Upload Times Out
**Cause**: File too large or network issue

**Fix**:
1. Test with smaller file (under 1MB)
2. Check network connectivity
3. Increase script timeout if needed

---

### Zapier Not Triggering
**Cause**: Zapier doesn't recognize CSV order format

**Fix**:
1. Add Zapier filter for Part ID = "CSV-ORDER"
2. Configure special handling for CSV orders
3. Map Column O to Monday.com field

---

## Performance Testing

### Load Test: Multiple Concurrent Uploads

**Objective**: Verify system handles multiple users uploading simultaneously

**Test Procedure**:
1. Have 3-5 users submit CSV orders at same time
2. Monitor for errors or timeouts
3. Verify all files uploaded successfully
4. Verify all orders recorded correctly

**Expected Result**: All uploads succeed without conflicts

---

### Large File Test

**Objective**: Verify handling of maximum size CSV files

**Test Procedure**:
1. Create 9MB CSV file
2. Upload through system
3. Monitor upload time
4. Verify file integrity in Drive

**Expected Result**: Upload completes in reasonable time (under 30 seconds)

---

## Regression Testing

Ensure existing functionality still works:

- [ ] **Browse Inventory Mode**: Still functions normally
  - Can search and add parts to cart
  - Can submit regular orders
  - Inventory updates correctly

- [ ] **Custom Request Mode**: Still functions normally
  - Can submit custom part requests
  - Validation works correctly

- [ ] **Add Part Form**: Still functions normally
  - Can add new parts to directory
  - Password protection works

- [ ] **Mobile Responsiveness**: All modes work on mobile
  - File input works on mobile browsers
  - Buttons accessible
  - Forms usable

---

## Security Testing

### Test Unauthorized Access

- [ ] **Direct Drive Folder Access**
  - Try accessing folder without sharing link
  - Expected: Folder not publicly listed

- [ ] **File URL Guessing**
  - Try modifying file ID in URL
  - Expected: Cannot access other files

- [ ] **XSS Prevention**
  - Try uploading CSV with malicious content
  - Expected: Content stored safely, not executed

---

## Acceptance Criteria

Feature is ready for production when:

1. All backend validation tests pass
2. All frontend validation tests pass
3. End-to-end test completes successfully
4. Column O exists in Orders sheet
5. Drive folder created and accessible
6. No console errors in browser
7. File uploads complete in under 10 seconds for 1MB files
8. Orders appear correctly in Orders sheet
9. CSV links open uploaded files
10. Team leaders can access and review CSV files
11. Regular order functionality not affected
12. Mobile testing complete

---

## Test Data Files

### Sample Test CSV

Create file named `test_wcp_order.csv`:
```csv
Product Code,Description,Quantity,Price
WCP-0123,Test Bolt #10-32 x 0.5",50,$3.99
WCP-0456,Test Gear 14t Spur,2,$8.50
WCP-0789,Test Bearing 0.5" ID,10,$2.25
```

### Large Test CSV

Generate CSV with 1000 lines for load testing

---

## Test Report Template

**Test Date**: [Date]
**Tester Name**: [Name]
**Environment**: [Production / Test]
**Browser**: [Chrome/Firefox/Safari/Edge + Version]

| Test ID | Test Name | Result | Notes |
|---------|-----------|--------|-------|
| 1 | createWCPOrdersFolder() | [ ] Pass [ ] Fail | |
| 2 | uploadCSVToDrive() | [ ] Pass [ ] Fail | |
| 3 | submitOrder() CSV | [ ] Pass [ ] Fail | |
| 4 | showCSVUpload() | [ ] Pass [ ] Fail | |
| 5 | File Input | [ ] Pass [ ] Fail | |
| 6 | submitCSVOrder() | [ ] Pass [ ] Fail | |
| 7 | Happy Path | [ ] Pass [ ] Fail | |
| 8 | File Validation | [ ] Pass [ ] Fail | |
| 9 | Required Fields | [ ] Pass [ ] Fail | |
| 10 | End-to-End | [ ] Pass [ ] Fail | |

**Overall Result**: [ ] PASS [ ] FAIL

**Issues Found**: [List any bugs or problems]

**Recommendations**: [Suggestions for improvement]
