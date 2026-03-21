SPUDS IMS v2.0.11 — Release Notes (2026-03-21)

Highlights
- Added brand logo left of IMS title; version badge on the right.
- Fixed top menu bar to stay visible; then set as fixed below the main bar.
- Purchase Orders now fits to a full screen with normal font sizes.
- “Receive & Pay” converted to a dropdown (Receive, Pay, Receive & Pay, Cancel).
- Persistent sticky footer on Purchase Orders showing the dropdown.
- PO Items quality-of-life:
  - Auto-creates first row when empty and focuses Item.
  - Moved Add Row/Delete Row under the first editable row.
  - Buttons aligned side-by-side; Delete right of Add.
- Various spacing and layout refinements to match other modules.

Installer
- Rebuilt deploy ZIPs with version stamping:
  - SPUDS-IMS-Deploy.zip (latest)
  - releases/SPUDS-IMS-Deploy-2.0.11.zip

Notes
- Portable Node is bundled; portable MariaDB included by default.
- Use Start-IMS.cmd to launch on Windows.
