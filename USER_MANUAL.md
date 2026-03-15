# SPUDS IMS — User Manual

Version: 2.0.5

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

### Vendor Details (Field Reference)
- **Name**: The vendor/supplier company name. Used for searching and linking purchase orders.
- **Balance (read-only)**: Outstanding balance (if provided by the source data). This is shown for reference and is not editable in the current UI.
- **Business Address**: The vendor’s mailing/business address. Use this for remittance, purchase order documents, and general contact.
- **Contact Name**: Primary contact person at the vendor.
- **Phone**: Primary contact phone number (office or mobile).
- **Fax**: Vendor fax number (if used).
- **Email**: Vendor email address for purchase order communication.
- **Website**: Vendor website URL.
- **Payment Terms**: Terms you have with the vendor (examples: NET 30, COD). Used as a reference for due dates and expected payment timing.
- **Taxing Scheme**: Vendor tax code/group used for purchasing tax rules (if applicable).
- **Carrier**: Preferred shipping carrier for this vendor (example: UPS, FedEx, Local Delivery).
- **Currency**: Currency used for transactions with this vendor (example: USD, CAD).
- **Remarks**: Free-form notes about the vendor (instructions, warnings, special handling, etc.).

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

### Header (Field Reference)
- **Vendor**: Vendor/company name for this purchase order.
- **Contact**: Contact person for the vendor on this order.
- **Phone**: Vendor phone related to this order.
- **Vendor Address**: Address for the vendor (used for reference when issuing/printing).
- **Order #**: Purchase order number (your internal or imported document number).
- **Date**: Order date.
- **Status**: Current order status (example: OPEN, CLOSED, RECEIVED). This is informational unless your workflow supports edits.
- **Ship-To Address**: Where the vendor should ship the order.

### Items
- “Add Row” adds a line item.
- “Delete Row” deletes the selected line item.
- Line item fields:
  - **Item**: Your item code/name for the product being purchased.
  - **Description**: Item description shown on the order.
  - **Vendor Product Code**: Vendor’s SKU/part number for the item.
  - **Quantity**: Units ordered (must be 0 or greater).
  - **Unit Price**: Price per unit for this line (must be 0 or greater).
  - **Discount**: Line discount amount (currency) applied to this line (must be 0 or greater).
  - **Sub-Total (calculated)**: `Quantity × Unit Price − Discount`.
- Totals update automatically as you edit.

Note: Purchase Order line items and edits are not saved back to the database in the current UI.

### Tabs
- Purchasing: Terms & Dates, Tax & Currency, Totals.
- Advanced: currently shows “No advanced fields yet”.

#### Purchasing → Terms & Dates (Field Reference)
- **Terms**: Payment terms for this PO (example: NET 30). Often aligns with the vendor’s default terms.
- **Due Date**: When payment is due (informational unless used by your workflow).
- **Req. Ship Date**: Requested ship date you want the vendor to ship by.
- **Remarks**: Notes specific to this purchase order.

#### Purchasing → Tax & Currency (Field Reference)
- **Taxing Scheme**: Tax code/group used for purchase taxation on this order.
- **Non-Vendor Costs**: Extra costs not charged by the vendor as line items (example: broker fees, misc fees).
- **Currency**: Currency for the purchase order totals.

#### Purchasing → Totals (Field Reference)
- **Sub-Total (read-only)**: Sum of line sub-totals.
- **Freight**: Shipping/freight charges for the order. Used in total calculation.
- **Total (read-only)**: `Sub-Total + Freight`.
- **Paid**: Amount paid toward the order (used in balance calculation).
- **Balance (read-only)**: `Total − Paid` (never below 0).
- **Receive & Pay**: Action button placeholder for workflow; behavior depends on your configuration/version.

## 7) Sales Order

### Search
- Filter by Order #, Status, Customer, Date From/To; click “Refresh” to reload data.
- Select an order from the left list to load it.

### Header (Field Reference)
- **Customer**: Customer/company name for this sales order.
- **Contact**: Customer contact person for this order.
- **Phone**: Customer phone related to this order.
- **Address**: Customer billing address used for the order (informational unless printed/exported).
- **Order #**: Sales order number (your internal or imported document number).
- **Date**: Order date.
- **Status**: Current order status (example: OPEN, INVOICED, CLOSED).
- **Ship-To Address**: Where the order will be shipped/delivered.

### Items
- “Add Row” adds a line item.
- “Delete Row” deletes the selected line item.
- Line item fields:
  - **Item**: Your item code/name for the product being sold.
  - **Description**: Item description shown on the order.
  - **Quantity**: Units sold (must be 0 or greater).
  - **Unit Price**: Price per unit for this line (must be 0 or greater).
  - **Discount**: Line discount amount (currency) applied to this line (must be 0 or greater).
  - **Sub-Total (calculated)**: `Quantity × Unit Price − Discount`.
- Totals update automatically as you edit.

Note: Sales Order line items and edits are not saved back to the database in the current UI.

### Tabs
- Sales: Terms & Dates, Pricing & Tax, Totals.
- Advanced: currently shows “No advanced fields yet”.

#### Sales → Terms & Dates (Field Reference)
- **Terms**: Payment terms for this SO (example: NET 15, NET 30).
- **Due Date**: When payment is due (informational unless used by your workflow).
- **Req. Ship Date**: Requested ship date you want to ship by.
- **Remarks**: Notes specific to this sales order.

#### Sales → Pricing & Tax (Field Reference)
- **Taxing Scheme**: Tax code/group used for sales tax rules on this order.
- **Currency**: Currency for the sales order totals.

#### Sales → Totals (Field Reference)
- **Sub-Total (read-only)**: Sum of line sub-totals.
- **Total (read-only)**: Currently equals Sub-Total (no freight field on the Sales Order screen).
- **Paid**: Amount paid toward the order (used in balance calculation).
- **Balance (read-only)**: `Total − Paid` (never below 0).
- **Complete & Pay**: Action button placeholder for workflow; behavior depends on your configuration/version.

## 8) Customer

### Search
- Filter by Name and click “Refresh” if needed.
- Select a customer from the left list to load details.

### Addresses
- Use “Business Address” vs “Shipping Address” selector to switch which address you are editing.

### Customer Details (Field Reference)
- **Name**: Customer/company name. Used for searching and linking sales orders.
- **Balance (read-only)**: Outstanding balance (if provided by the source data). Shown for reference.
- **Business Address**: Billing or main business address for the customer.
- **Shipping Address**: Default ship-to/delivery address for the customer.
- **Contact Name**: Primary contact person at the customer.
- **Phone**: Primary contact phone number.
- **Fax**: Customer fax number (if used).
- **Email**: Customer email address for invoices/communication.
- **Website**: Customer website URL.
- **Pricing / Currency**: Default currency for this customer’s pricing (informational unless used by your workflow).
- **Discount**: Default discount for this customer (informational unless used by your workflow).
- **Payment Terms**: Default payment terms for this customer.
- **Taxing Scheme**: Tax code/group used for sales tax rules for this customer.
- **Tax Exempt #**: Customer tax exemption identifier (if applicable).
- **Remarks**: Free-form notes about the customer.

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

### Basic (Field Reference)
- **Item Name/Code**: Primary item identifier (SKU / item code / item name). Used for searching, order lines, tracking, and lookups.
- **Category**: Category/grouping for reporting and search filtering.
- **Type**:
  - **Stockable**: Physical item tracked in inventory.
  - **Non-stock**: Item not tracked as inventory (often purchased/sold but not stocked).
  - **Service**: Service line (non-inventory).
- **Description**: Human-readable description for the item.

### Picture
- Picture:
  - “Browse” selects an image.
  - “Clear” removes the image.
  - Note: product pictures are stored in the browser (local to that PC/browser).

### Costing Info (Field Reference)
- **Costing Method**:
  - **Moving Average**: Cost is averaged as purchases occur.
  - **FIFO**: First in, first out costing.
  - **LIFO**: Last in, first out costing.
- **Edit / History**: Opens costing history tools (if enabled in your version).

### Sales Info (Field Reference)
- **Tax Code**: Tax code/group for sales tax on this product.
- **CASH**: Default cash price / sales price for the product.
- **ACCOUNT**: Account price (if you use account-based pricing tiers).
- **CHECK**: Check price (if you use payment-method pricing tiers).
- **Add new Pricing / currency**: Adds additional pricing tiers/currencies (if enabled in your version).

### Inventory Locations
- “Add Row” / “Delete Row” edits location/sublocation/quantity lines.
  - **Location**: Warehouse/site/bin group name.
  - **Sublocation**: Sub-bin or finer-grained location.
  - **Quantity**: Quantity at that location (must be 0 or greater).
Note: the Inventory Locations grid is not saved back to the database in the current UI.

### Tabs

#### Product Info
- Shows a raw key/value view of the loaded row.

#### Extra Info
- Storage Info:
  - **Barcode**: UPC/EAN/Barcode string for scanning.
  - **Reorder Point**: Threshold where the product should be reordered.
  - **Reorder Quantity**: Suggested reorder amount when below reorder point.
  - **Default Location**: Default warehouse/location used for receiving/picking.
  - **Default Sublocation**: Default sublocation/bin used for receiving/picking.
  - **Last Vendor**: Last supplier/vendor used for this item (informational).
- Unit of Measure:
  - **Standard UoM**: Base unit for the item (example: EACH, BOX).
  - **Sales UoM (SU)**: Unit used when selling (example: EACH).
  - **Purchasing UoM (PU)**: Unit used when purchasing (example: CASE).
  - **Loose UoM (LU)**: Unit used for loose/breakdown quantities (example: EACH inside a CASE).
  - **PU per LU**: How many purchasing units per loose unit (your configured conversion).
  - **SU per LU**: How many sales units per loose unit (your configured conversion).
- Tracking (None / Serial / Lot):
  - Add Row / Delete Row: edit tracking lines.
  - Scan Mode (Serial only): scan serials and press Enter to add (qty=1).
  - Add N Rows: bulk-add blank rows.
  - Allocate FEFO: sorts by earliest expiration first.
  - Import CSV / Export CSV: import or export tracking lines.
  - Expiration dates are highlighted when expired or within ~30 days.
  - Tracking grid columns:
    - **Serial Number** (Serial mode): Unique serial identifier for one physical unit.
    - **Lot Number** (Lot mode): Lot/batch identifier shared by many units.
    - **Expiration Date**: Expiration date (optional but recommended for FEFO).
    - **Location / Sublocation**: Where the serial/lot is stored.
    - **Quantity**: Quantity for the lot row (Serial mode forces qty=1).
- Bill of Materials:
  - Add Component / Delete Component
  - Total Cost is calculated from Quantity × Cost.
  - BOM grid columns:
    - **Component Item**: Item code/name of a component.
    - **Description**: Component description.
    - **Quantity**: Quantity of the component required.
    - **Cost**: Cost per unit used for BOM rollup.
- Measurements: Length, Width, Height, Weight.
  - Used for storage/shipping calculations (informational unless integrated with a shipping workflow).
- Remarks: Notes specific to the product.

#### Product Vendors
- Add Row / Delete Row for vendor-specific pricing and codes.
  - Grid columns:
    - **Vendor**: Vendor name for this item.
    - **Vendor’s Price**: Vendor-specific cost/price for this item.
    - **Vendor Product Code**: Vendor’s SKU/part number for this item.

#### Movement History / Order History
- These panels show a tracking summary (Serial/Lot totals) when tracking is enabled.
  - Order History shows how the item appears on purchase/sales orders (Type, Order #, Customer/Vendor, Quantity, Unit Price, Sub-Total).
  - Summary fields:
    - **Quantity on Hand**: Total tracked quantity currently available in stock.
    - **Quantity Reserved**: Quantity committed/reserved to orders (if provided by source/tracking data).
    - **Quantity on Order**: Quantity expected from purchase orders (if provided by source/tracking data).
    - **Quantity Available**: Quantity available after reservations (if provided by source/tracking data).

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
- Backup includes both:
  - Current database (default: `ims`)
  - Archive database (default: `ims_archive`)

Note: The system may also create automatic backups (scheduled task) in the `backups` folder.

### Restore Database
- Click “Restore Database” and choose a .zip backup or a .sql file.
- Restore replays the SQL file, which can recreate and restore both the current and archive databases if the backup contains them.

### Clear Database
- Click “Clear Database” to permanently erase all data in the current database.
- Use this only when you want to reset the system (example: before importing fresh data).
- This action requires confirmation text and the admin password.

### Archive Prior Years
- Click “Archive Prior Years” to move Purchase Orders and Sales Orders before the current year into the archive database.
- This keeps the “current” database smaller and improves day-to-day search performance.
- This action requires confirmation text and the admin password.

### Rebalance Archive
- Click “Rebalance Archive” to enforce a clean split:
  - Orders before the current year are in the archive database
  - Orders from the current year onward are in the current database
- This is useful if records were archived too aggressively or if some older records were re-imported into the current database.
- This action requires confirmation text and the admin password.

### Normalize Collations
- Click “Normalize Collations” to align tables to utf8mb4 / utf8mb4_unicode_ci.

### Fix Duplicate Records
- Click “Fix Duplicate Records” to remove exact duplicate rows (keeps one copy).
- Use this if you see duplicated vendors/customers/orders after an import.
- This action requires confirmation and the admin password.

### Run Diagnostics
- Click “Run Diagnostics” for a health report (database connectivity, required views/tables, ports, and detected IPs).
