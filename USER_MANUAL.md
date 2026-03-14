# SPUDS IMS — User Manual

Version: 2.0.3

## 1) Access & Startup (Windows)

### Start
- Double-click [Start-IMS.cmd](file:///d:/Trae/SPUDS-IMS/Start-IMS.cmd).
- The app opens in your browser at:
  - http://localhost:3200/

### Stop
- Double-click [Stop-IMS.cmd](file:///d:/Trae/SPUDS-IMS/Stop-IMS.cmd).

### Diagnose / Fix Access
- Double-click [Diagnose-IMS.cmd](file:///d:/Trae/SPUDS-IMS/Diagnose-IMS.cmd).
- This checks health and can add Windows Firewall rules for the API port.

### Open From Another PC (Same Network)
- The server listens on all interfaces and can be reached from another device using:
  - http://<this-pc-ip>:3200/
- The “Run Diagnostics” tool (Settings) shows detected IPs as clickable links.

## 2) Login & Logout

### Sign In
1. Open http://localhost:3200/ (or your server IP URL).
2. Enter Username and Password.
3. Optional: enable “Remember Me”.
4. Click “Sign In”.

Notes:
- If the server is not configured with a required username/password, any username can be used and the password is ignored.
- “Remember Me” keeps you signed in longer on the same PC/browser.

### Logout
- Click “Logout” in the top bar (or on the login page).

## 3) Top Bar Controls

- Navigation: Dashboard, Vendor, Purchase Order, Inventory, Sales Order, Customer, Settings.
- Search: the “SEARCH...” box filters the current section:
  - Inventory: filters Name/Code (and clears other inventory filters).
  - Vendor: filters Vendor Name (and clears Contact/Phone filters).
  - Purchase Order / Sales Order: filters Order #.
  - Customer: filters Customer Name.
  - Press Esc in the search box to clear it.
- User: shows the current user (upper + lower display).
- Mobile / Desktop: toggles layout mode.
- Dark / Light: toggles theme.

Note: most text inputs are automatically converted to UPPERCASE as you type.

## 4) Dashboard

Dashboard shows quick counts:
- Inventory
- Vendors
- Customers
- Open Orders

## 5) Vendor

### Search
- Use the left-side Search filters (Name, Contact, Phone), then click “Refresh” if needed.
- Select a vendor from the list to load details.

### Vendor Details
Fields include:
- Basic: Name, Balance (read-only)
- Address: Business Address
- Contact: Name, Phone, Fax, Email, Website
- Purchasing Info: Payment Terms, Taxing Scheme, Carrier, Currency
- Remarks

### Tabs
- Vendor Info: raw key/value view of the loaded row.
- Vendor Products: table area (if available).
- Order History: table area (if available).

### Import Vendors From Purchase Orders
- Click “Import From PO”.
- This builds a derived vendor list from the Purchase Order data.

Note: Vendor edits are not saved back to the database in the current UI.

## 6) Purchase Order

### Search
- Filter by Order #, Status, Vendor, Date From/To; click “Refresh” to reload data.
- Select an order from the left list to load it.

### Items
- “Add Row” adds a line item.
- “Delete Row” deletes the selected line item.
- Line item fields: Item, Description, Vendor Product Code, Quantity, Unit Price, Discount.
- Totals update automatically as you edit.

Note: Purchase Order line items and edits are not saved back to the database in the current UI.

### Tabs
- Purchasing: Terms & Dates, Tax & Currency, Totals.
- Advanced: currently shows “No advanced fields yet”.

## 7) Sales Order

### Search
- Filter by Order #, Status, Customer, Date From/To; click “Refresh” to reload data.
- Select an order from the left list to load it.

### Items
- “Add Row” adds a line item.
- “Delete Row” deletes the selected line item.
- Line item fields: Item, Description, Quantity, Unit Price, Discount.
- Totals update automatically as you edit.

Note: Sales Order line items and edits are not saved back to the database in the current UI.

### Tabs
- Sales: Terms & Dates, Pricing & Tax, Totals.
- Advanced: currently shows “No advanced fields yet”.

## 8) Customer

### Search
- Filter by Name and click “Refresh” if needed.
- Select a customer from the left list to load details.

### Addresses
- Use “Business Address” vs “Shipping Address” selector to switch which address you are editing.

### Tabs
- Customer Info: raw key/value view.
- Extra Info: currently shows “No extra fields yet”.
- Order History: shows Sales Orders for the selected customer.

### Save
- Click “Save” to store customer extended fields (addresses and extra contact/purchasing fields).
Note: this saves the extended fields; it does not overwrite the base customer rows imported into the `customer` table/view.

## 9) Inventory (Product)

### Search
- Filter by Name/Code, Description, Category and click “Refresh” if needed.
- Select an item from the left list to load details.

### Basic & Picture
- Basic: Item Name/Code, Category, Type, Description.
- Picture:
  - “Browse” selects an image.
  - “Clear” removes the image.
  - Note: product pictures are stored in the browser (local to that PC/browser).

### Inventory Locations
- “Add Row” / “Delete Row” edits location/sublocation/quantity lines.
Note: the Inventory Locations grid is not saved back to the database in the current UI.

### Tabs

#### Product Info
- Shows a raw key/value view of the loaded row.

#### Extra Info
- Storage Info: Barcode, Reorder Point, Reorder Quantity, Default Location, Default Sublocation, Last Vendor.
- Unit of Measure: Standard UoM, Sales UoM (SU), Purchasing UoM (PU), Loose UoM (LU), conversions (PU per LU, SU per LU).
- Tracking (None / Serial / Lot):
  - Add Row / Delete Row: edit tracking lines.
  - Scan Mode (Serial only): scan serials and press Enter to add (qty=1).
  - Add N Rows: bulk-add blank rows.
  - Allocate FEFO: sorts by earliest expiration first.
  - Import CSV / Export CSV: import or export tracking lines.
  - Expiration dates are highlighted when expired or within ~30 days.
- Bill of Materials:
  - Add Component / Delete Component
  - Total Cost is calculated from Quantity × Cost.
- Measurements: Length, Width, Height, Weight.

#### Product Vendors
- Add Row / Delete Row for vendor-specific pricing and codes.

#### Movement History / Order History
- These panels show a tracking summary (Serial/Lot totals) when tracking is enabled.

### Save
- Click “Save” to store extended inventory fields (extra info, BOM, vendors, tracking).
- For Serial tracking:
  - Quantity is forced to 1 per row.
  - Serial values must be unique.

## 10) Settings

### Logo
- Select Logo: choose an image to display in the app header and login page.
- Clear Logo: remove the current logo.
Note: the logo is stored in the browser (local to that PC/browser).

### Backup Database
- Click “Backup Database” to download a ZIP containing a SQL backup.

### Restore Database
- Click “Restore Database” and choose a .zip backup or a .sql file.
- Restore replaces data in the database.

### Normalize Collations
- Click “Normalize Collations” to align tables to utf8mb4 / utf8mb4_unicode_ci.

### Run Diagnostics
- Click “Run Diagnostics” for a health report (database connectivity, required views/tables, ports, and detected IPs).
