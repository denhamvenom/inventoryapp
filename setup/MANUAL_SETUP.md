# Manual Setup Guide - Denham Venom Parts System

Since service accounts require Google Workspace Domain-wide Delegation to create sheets, here's a quick manual setup guide:

## Step 1: Create Parts Directory Spreadsheet

1. Go to https://sheets.google.com
2. Click **"Blank"** to create a new spreadsheet
3. Name it: **"Denham Venom Parts Directory"**

### Create "Parts" Tab:
Rename "Sheet1" to **"Parts"** and add these headers in row 1:

```
Part ID | Part Name | Category | Subcategory | Type | Size/Spec 1 | Spec 2 | Quantity Per | Cost | Supplier | Order Link | Location/Bin | Notes | Status | Date Added | Added By
```

### Create "Categories" Tab:
1. Click the **"+"** button at the bottom to add a new sheet
2. Name it **"Categories"**
3. Add these headers in row 1:

```
Category Name | Code | Sort Order
```

4. Add these 10 rows:
```
Fasteners | FAST | 1
Electronics and Sensors | ELEC | 2
Raw Stock | STOCK | 3
Movement | MOVE | 4
Build Site Equipment | BSITE | 5
Pneumatics | PNEU | 6
Business, Outreach, Media | BUSI | 7
Machining Tools | MACH | 8
Safety Equipment | SAFE | 9
Wiring, Cables, Connectors | WIRE | 10
```

5. **Copy the Spreadsheet ID** from the URL:
   - URL looks like: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`
   - Copy the long ID between `/d/` and `/edit`

---

## Step 2: Create Parts Orders Spreadsheet

1. Go to https://sheets.google.com
2. Click **"Blank"** to create a new spreadsheet
3. Name it: **"Denham Venom Parts Orders"**

### Create "Orders" Tab:
Rename "Sheet1" to **"Orders"** and add these headers in row 1:

```
Order # | Date | Student Name | Part ID | Part Name | Category | Quantity Requested | Priority | Unit Cost | Total Cost | Status | Notes | Monday ID
```

### Create "Students" Tab:
1. Click the **"+"** button to add a new sheet
2. Name it **"Students"**
3. Add these headers in row 1:

```
Name | Subteam | Active
```

### Create "New Parts" Tab:
1. Click the **"+"** button to add a new sheet
2. Name it **"New Parts"**
3. Add these headers in row 1:

```
Date | Student Name | Part Name | Category | Estimated Cost | Where to Buy | Link | Status
```

4. **Copy the Spreadsheet ID** from the URL

---

## Step 3: Update Code.js

1. Open `/src/Code.js` in your editor
2. Find lines 11-12 (the CONFIG object)
3. Replace the placeholder IDs:

```javascript
const CONFIG = {
  PARTS_DIRECTORY_ID: 'YOUR_PARTS_DIRECTORY_ID_HERE',  // ← Paste first spreadsheet ID
  PARTS_ORDERS_ID: 'YOUR_PARTS_ORDERS_ID_HERE',        // ← Paste second spreadsheet ID
  // ... rest stays the same
};
```

---

## Step 4: Populate Sample Data (Optional)

You can manually copy the sample data from the CSV files:

### For Parts (from data/parts.csv):
Copy and paste into the "Parts" tab of the Parts Directory spreadsheet

### For Students (from data/students.csv):
Copy and paste into the "Students" tab of the Parts Orders spreadsheet

Or use a CSV import:
1. In Google Sheets, go to **File → Import**
2. Upload the CSV file
3. Choose **"Append to current sheet"**

---

## Step 5: Deploy the Apps Script

1. Push code to Google Apps Script:
   ```bash
   npm run push
   ```

2. Open the Apps Script project:
   ```bash
   clasp open
   ```

3. Deploy as web app:
   - Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**

4. Copy the web app URL

---

## Step 6: Test

1. Open the web app URL in your browser
2. Test the Order Parts form
3. Test the Add Part form (password: `venom8044`)
4. Verify data appears in your spreadsheets

---

## Troubleshooting

**If dropdowns don't populate:**
- Check that spreadsheet IDs are correct in Code.js
- Verify sheet names match exactly: "Parts", "Categories", "Orders", "Students"
- Check browser console for errors

**If orders don't save:**
- Verify the "Orders" sheet has all required columns
- Check Apps Script logs: `npm run logs`

**If Add Part form doesn't work:**
- Default password is `venom8044`
- Check that "Parts" sheet exists in Parts Directory

---

## Next Steps

Once everything is working:
1. Add your real student roster
2. Add your parts inventory
3. Share the web app URL with your team
4. Set up Zapier integration with Monday.com (if needed)
5. Change the Add Part password in Code.js line 16

---

## Quick Reference

**Spreadsheet Names:**
- Parts Directory: "Denham Venom Parts Directory"
- Parts Orders: "Denham Venom Parts Orders"

**Sheet Tab Names:**
- Parts Directory: "Parts", "Categories"
- Parts Orders: "Orders", "Students", "New Parts"

**Default Password:** `venom8044`

**NPM Commands:**
- `npm run push` - Deploy code
- `npm run open` - Open web app
- `npm run logs` - View logs
