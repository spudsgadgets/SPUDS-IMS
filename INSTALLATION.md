# SPUDS IMS — Installation Manual

This guide covers the installation, setup, and uninstallation of the **SPUDS IMS** (Inventory Management System) on Windows.

## 1) Prerequisites
- **Windows 10/11** (64-bit recommended).
- **PowerShell 5.1** or higher (included with Windows).
- **Administrator Privileges** (required for shortcuts, PATH integration, and firewall rules).
- **Internet Connection** (only for the initial download of Node.js and MariaDB if using the automated installer).

---

## 2) Quick Installation (Recommended)
1.  **Download and Extract**: Download the `SPUDS-IMS-Installer-vX.X.X.zip` and extract it to a temporary folder.
2.  **Run Installer**:
    - Right-click `install-spuds-ims.ps1` and select **Run with PowerShell**.
    - *Alternatively*: Double-click `install.bat`.
3.  **Follow Prompts**:
    - **Installation Directory**: Default is `%LOCALAPPDATA%\SPUDS-IMS`.
    - **Ports**: Default API port is `3200`, Database port is `3307`.
    - **Shortcuts**: Choose if you want Desktop and Start Menu shortcuts.
4.  **Completion**: Once finished, the app will offer to start immediately.

---

## 3) Manual / Portable Setup
If you prefer not to use the installer:
1.  Extract the `SPUDS-IMS-Deploy.zip` to your desired folder.
2.  Run `Setup-Portable-Node.cmd` to prepare the Node.js runtime.
3.  Run `Start-IMS.cmd` to initialize the database and start the server.

---

## 4) Post-Installation
- **Start the App**: Use the **SPUDS IMS** shortcut on your Desktop or Start Menu.
- **Single Window Experience**: The app now launches both the database and the server in a single, consolidated window for better efficiency.
- **Access**: Open [http://localhost:3200](http://localhost:3200) in your browser.
- **Firewall**: If accessing from other PCs, the installer automatically adds the necessary Windows Firewall rules.

---

## 5) Uninstallation
To remove SPUDS IMS from your system:
1.  **Locate Uninstaller**: Go to your installation folder (e.g., `%LOCALAPPDATA%\SPUDS-IMS`) or use the **SPUDS IMS Uninstall** shortcut.
2.  **Run Uninstaller**:
    - Right-click `uninstall-spuds-ims.ps1` and select **Run with PowerShell**.
3.  **Interactive Data Removal**:
    - The uninstaller will display a prompt: **"Remove Database and Backups?"**
    - Select **Yes** to perform a complete wipe of all application files and data.
    - Select **No** to remove the application binaries but keep your database and backups for future use.
4.  **Advanced (Command Line)**:
    ```powershell
    # Standard uninstall (interactive prompt)
    .\uninstall-spuds-ims.ps1

    # Force remove everything including data (silent)
    .\uninstall-spuds-ims.ps1 -RemoveData -Silent

    # Remove app but keep data (silent)
    .\uninstall-spuds-ims.ps1 -KeepData -Silent
    ```

---

## 6) Troubleshooting
- **Port Conflicts**: If port `3200` or `3307` is in use, the installer will warn you. You can choose different ports during setup.
- **Logs**: Installation logs are stored in `%TEMP%\spuds-ims-install.log`. Uninstallation logs are in `%TEMP%\spuds-ims-uninstall.log`.
- **Diagnostics**: Run the **SPUDS IMS Diagnose** shortcut or go to **Settings > Run Diagnostics** inside the app to check system health.
