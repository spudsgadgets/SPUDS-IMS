SPUDS IMS v2.0.12 — Release Notes (2026-03-21)

Fixes
- Purchase Orders: Toolbar (“New / Save / Print / Copy …”) now fixed and always visible.
  - Uses dynamic top offset aligned with app bar and menubar.
  - Preserves layout with spacer to avoid content jump.
- Desktop layout: Content padding accounts for menubar height to prevent overlap.

Installer
- Rebuilt deploy ZIPs with updated UI/JS:
  - SPUDS-IMS-Deploy.zip (latest)
  - releases/SPUDS-IMS-Deploy-2.0.12.zip

Notes
- Portable Node bundled; portable MariaDB included by default.
- Launch via Start-IMS.cmd on Windows.
