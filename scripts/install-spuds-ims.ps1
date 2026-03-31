param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "SPUDS-IMS"),
  [int]$Port = 3201,
  [int]$DbPort = 3307,
  [switch]$Silent,
  [switch]$NoMariaDB,
  [switch]$StartAfterInstall,
  [switch]$CreateShortcuts,
  [switch]$AddToPath
)

$ErrorActionPreference = "Stop"
$script:LogFile = Join-Path $env:TEMP "spuds-ims-install.log"

function Write-Log {
  param([string]$Message, [string]$Level = "INFO")
  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $logEntry = "[$timestamp] [$Level] $Message"
  Add-Content -Path $script:LogFile -Value $logEntry
  if(-not $Silent) {
    switch($Level) {
      "ERROR" { Write-Host $Message -ForegroundColor Red }
      "WARNING" { Write-Host $Message -ForegroundColor Yellow }
      "SUCCESS" { Write-Host $Message -ForegroundColor Green }
      default { Write-Host $Message }
    }
  }
}

function Test-Admin {
  try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  } catch {
    return $false
  }
}

function Show-Progress {
  param([string]$Activity, [string]$Status, [int]$PercentComplete)
  if(-not $Silent) {
    Write-Progress -Activity $Activity -Status $Status -PercentComplete $PercentComplete
  }
}

function Install-Prerequisites {
  Write-Log "Checking prerequisites..."
  Show-Progress -Activity "Installing SPUDS IMS" -Status "Checking prerequisites" -PercentComplete 10
  
  # Check PowerShell version
  if($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Log "PowerShell 5.0 or higher is required. Please upgrade PowerShell." "ERROR"
    exit 1
  }
  
  # Check if running as admin for certain features
  if($CreateShortcuts -or $AddToPath) {
    if(-not (Test-Admin)) {
      Write-Log "Administrator privileges required for shortcuts and PATH modification." "WARNING"
      Write-Log "Running without these features..."
      $CreateShortcuts = $false
      $AddToPath = $false
    }
  }
  
  Write-Log "Prerequisites check completed."
}

function Install-NodeJS {
  Show-Progress -Activity "Installing SPUDS IMS" -Status "Setting up Node.js" -PercentComplete 20
  
  $nodeDir = Join-Path $InstallDir "node"
  $nodeExe = Join-Path $nodeDir "node.exe"
  
  if(Test-Path $nodeExe) {
    Write-Log "Node.js already exists in installation directory."
    return $nodeExe
  }
  
  Write-Log "Downloading and installing portable Node.js..."
  
  try {
    $version = "20.11.1"
    $arch = "x64"
    $zipUrl = "https://nodejs.org/dist/v$version/node-v$version-win-$arch.zip"
    $tmpZip = Join-Path $env:TEMP "node-$version-$arch-$(New-Guid).zip"
    $tmpExtract = Join-Path $env:TEMP "node-extract-$(New-Guid)"
    
    Invoke-WebRequest -Uri $zipUrl -OutFile $tmpZip -UseBasicParsing -TimeoutSec 120
    Expand-Archive -Path $tmpZip -DestinationPath $tmpExtract -Force
    
    $extractedDir = Get-ChildItem -Path $tmpExtract -Directory | Where-Object { $_.Name -like "node-v$version*" } | Select-Object -First 1
    if($extractedDir) {
      $sourceExe = Join-Path $extractedDir.FullName "node.exe"
      if(Test-Path $sourceExe) {
        if(-not (Test-Path $nodeDir)) { New-Item -ItemType Directory -Path $nodeDir -Force | Out-Null }
        Copy-Item -Path $sourceExe -Destination $nodeExe -Force
        Write-Log "Node.js installed successfully." "SUCCESS"
      }
    }
    
    # Cleanup
    Remove-Item -Path $tmpZip -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $tmpExtract -Recurse -Force -ErrorAction SilentlyContinue
    
  } catch {
    Write-Log "Failed to install Node.js: $($_.Exception.Message)" "ERROR"
    exit 1
  }
  
  return $nodeExe
}

function Install-MariaDB {
  Show-Progress -Activity "Installing SPUDS IMS" -Status "Setting up MariaDB" -PercentComplete 40
  
  if($NoMariaDB) {
    Write-Log "Skipping MariaDB installation (-NoMariaDB specified)."
    return $null
  }
  
  $mariaDir = Join-Path $InstallDir "mariadb"
  $binDir = Join-Path $mariaDir "bin"
  $mysqldExe = Join-Path $binDir "mariadbd.exe"
  
  if(-not (Test-Path $mysqldExe)) {
    $mysqldExe = Join-Path $binDir "mysqld.exe"
  }
  
  if(Test-Path $mysqldExe) {
    Write-Log "MariaDB already exists in installation directory."
    return $mysqldExe
  }
  
  Write-Log "Downloading and installing portable MariaDB..."
  
  try {
    $version = "10.11.8"
    $zipName = "mariadb-$version-winx64.zip"
    $urls = @(
      "https://downloads.mariadb.org/f/mariadb-$version/winx64-packages/mariadb-$version-winx64.zip?serve=1",
      "https://archive.mariadb.org/mariadb-$version/winx64-packages/mariadb-$version-winx64.zip"
    )
    
    $tmpZip = Join-Path $env:TEMP "mariadb-$version-$(New-Guid).zip"
    $tmpExtract = Join-Path $env:TEMP "mariadb-extract-$(New-Guid)"
    
    # Download MariaDB
    foreach($url in $urls) {
      Write-Log "Attempting download: $url"
      try {
        Invoke-WebRequest -Uri $url -OutFile $tmpZip -UseBasicParsing -TimeoutSec 180
        if((Get-Item $tmpZip).Length -gt 1000000) { break }
      } catch {
        Write-Log "Download failed: $($_.Exception.Message)" "WARNING"
      }
    }
    
    if(-not (Test-Path $tmpZip) -or ((Get-Item $tmpZip).Length -lt 1000000)) {
      throw "Unable to download MariaDB ZIP; please check internet connectivity."
    }
    
    # Extract MariaDB
    Write-Log "Extracting MariaDB..."
    Expand-Archive -Path $tmpZip -DestinationPath $tmpExtract -Force
    
    # Find extracted directory
    $extractedDir = Get-ChildItem -Path $tmpExtract -Directory | Where-Object { $_.Name -like "mariadb-$version*" } | Select-Object -First 1
    if($extractedDir) {
      Write-Log "Copying MariaDB files to installation directory..."
      if(-not (Test-Path $mariaDir)) { New-Item -ItemType Directory -Path $mariaDir -Force | Out-Null }
      
      # Copy all files
      Get-ChildItem -Path $extractedDir.FullName -Recurse | ForEach-Object {
        $destPath = $_.FullName.Replace($extractedDir.FullName, $mariaDir)
        if($_.PSIsContainer) {
          if(-not (Test-Path $destPath)) { New-Item -ItemType Directory -Path $destPath -Force | Out-Null }
        } else {
          $destDir = Split-Path -Parent $destPath
          if(-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
          Copy-Item -Path $_.FullName -Destination $destPath -Force
        }
      }
      
      Write-Log "MariaDB installed successfully." "SUCCESS"
    }
    
    # Cleanup
    Remove-Item -Path $tmpZip -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $tmpExtract -Recurse -Force -ErrorAction SilentlyContinue
    
  } catch {
    Write-Log "Failed to install MariaDB: $($_.Exception.Message)" "ERROR"
    exit 1
  }
  
  return $mysqldExe
}

function Configure-MariaDB {
  param([string]$MysqldPath)
  
  if(-not $MysqldPath -or $NoMariaDB) { return }
  
  Show-Progress -Activity "Installing SPUDS IMS" -Status "Configuring MariaDB" -PercentComplete 60
  
  Write-Log "Configuring MariaDB..."
  
  try {
    $mariaDir = Split-Path -Parent (Split-Path -Parent $MysqldPath)
    $localRoot = Join-Path $InstallDir "local-mariadb"
    $myIni = Join-Path $localRoot "my.ini"
    $dataDir = Join-Path $localRoot "data"
    
    if(-not (Test-Path $localRoot)) { New-Item -ItemType Directory -Path $localRoot -Force | Out-Null }
    if(-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
    
    # Create my.ini configuration
    $basePath = ($mariaDir -replace '\\','/')
    $dataPath = ($dataDir -replace '\\','/')
    $tmpPath = ($env:TEMP -replace '\\','/')
    
    @"
[mysqld]
basedir=$basePath
datadir=$dataPath
tmpdir=$tmpPath
bind-address=127.0.0.1
port=$DbPort
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
skip-name-resolve
max_allowed_packet=64M
sql_mode=
default_storage_engine=InnoDB
innodb_buffer_pool_size=128M
innodb_log_file_size=48M

[client]
port=$DbPort
"@ | Set-Content -Path $myIni -Encoding ASCII
    
    Write-Log "MariaDB configuration completed." "SUCCESS"
    
  } catch {
    Write-Log "Failed to configure MariaDB: $($_.Exception.Message)" "ERROR"
  }
}

function Create-StartScript {
  Show-Progress -Activity "Installing SPUDS IMS" -Status "Creating startup scripts" -PercentComplete 80
  
  Write-Log "Creating startup scripts..."
  
  try {
    # Main start script
    $startScript = Join-Path $InstallDir "start-spuds-ims.bat"
    $nodeExe = Join-Path $InstallDir "node\node.exe"
    $serverJs = Join-Path $InstallDir "server.js"
    
    @"
@echo off
echo Starting SPUDS IMS Server...
cd /d "%~dp0"
"$nodeExe" "$serverJs"
pause
"@ | Set-Content -Path $startScript -Encoding ASCII
    
    # Database start script
    if(-not $NoMariaDB) {
      $dbStartScript = Join-Path $InstallDir "start-database.bat"
      $mysqldExe = Join-Path $InstallDir "mariadb\bin\mariadbd.exe"
      if(-not (Test-Path $mysqldExe)) {
        $mysqldExe = Join-Path $InstallDir "mariadb\bin\mysqld.exe"
      }
      
      @"
@echo off
echo Starting SPUDS IMS Database...
cd /d "%~dp0"
"$mysqldExe" --defaults-file="local-mariadb\my.ini" --console
pause
"@ | Set-Content -Path $dbStartScript -Encoding ASCII
    }
    
    # Quick start script (starts both)
    $quickStartScript = Join-Path $InstallDir "quick-start.bat"
    @"
@echo off
echo SPUDS IMS Quick Start
echo ======================
echo.
echo Starting database and application server...
echo.
start "" "start-database.bat"
timeout /t 5 /nobreak > nul
start "" "start-spuds-ims.bat"
echo.
echo SPUDS IMS should now be running!
echo Database: http://localhost:$DbPort
echo Application: http://localhost:$Port
echo.
pause
"@ | Set-Content -Path $quickStartScript -Encoding ASCII
    
    Write-Log "Startup scripts created successfully." "SUCCESS"
    
  } catch {
    Write-Log "Failed to create startup scripts: $($_.Exception.Message)" "ERROR"
  }
}

function Create-Shortcuts {
  if(-not $CreateShortcuts) { return }
  
  Show-Progress -Activity "Installing SPUDS IMS" -Status "Creating shortcuts" -PercentComplete 85
  
  Write-Log "Creating shortcuts..."
  
  try {
    $WshShell = New-Object -ComObject WScript.Shell
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $programsPath = [Environment]::GetFolderPath("StartMenu")
    
    # Desktop shortcut
    $desktopShortcut = Join-Path $desktopPath "SPUDS IMS.lnk"
    $shortcut = $WshShell.CreateShortcut($desktopShortcut)
    $shortcut.TargetPath = Join-Path $InstallDir "quick-start.bat"
    $shortcut.WorkingDirectory = $InstallDir
    $shortcut.Description = "SPUDS IMS - Inventory Management System"
    $shortcut.Save()
    
    # Start menu shortcut
    $startMenuDir = Join-Path $programsPath "SPUDS IMS"
    if(-not (Test-Path $startMenuDir)) { New-Item -ItemType Directory -Path $startMenuDir -Force | Out-Null }
    
    $startMenuShortcut = Join-Path $startMenuDir "SPUDS IMS.lnk"
    $shortcut = $WshShell.CreateShortcut($startMenuShortcut)
    $shortcut.TargetPath = Join-Path $InstallDir "quick-start.bat"
    $shortcut.WorkingDirectory = $InstallDir
    $shortcut.Description = "SPUDS IMS - Inventory Management System"
    $shortcut.Save()
    
    Write-Log "Shortcuts created successfully." "SUCCESS"
    
  } catch {
    Write-Log "Failed to create shortcuts: $($_.Exception.Message)" "WARNING"
  }
}

function Add-ToPath {
  if(-not $AddToPath) { return }
  
  Write-Log "Adding to system PATH..."
  
  try {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if($currentPath -notlike "*$InstallDir*") {
      $newPath = $currentPath + ";" + $InstallDir
      [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
      Write-Log "Added to system PATH successfully." "SUCCESS"
    } else {
      Write-Log "Installation directory already in PATH."
    }
    
  } catch {
    Write-Log "Failed to add to PATH: $($_.Exception.Message)" "WARNING"
  }
}

function Install-Application {
  Show-Progress -Activity "Installing SPUDS IMS" -Status "Installing application files" -PercentComplete 70
  
  Write-Log "Installing application files..."
  
  try {
    $sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $sourceDir = Split-Path -Parent $sourceDir
    
    # Create installation directory
    if(-not (Test-Path $InstallDir)) {
      New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    
    # Copy application files
    $exclude = @('node_modules', '.git', 'releases', 'local-mariadb', 'backups', 'logs', '.github', '.vscode', 'scripts')
    $excludeFiles = @('.gitignore', 'install-spuds-ims.ps1')
    
    Get-ChildItem -Path $sourceDir -Force | ForEach-Object {
      if($exclude -contains $_.Name) { return }
      if($excludeFiles -contains $_.Name) { return }
      if($_.Extension -in @('.zip', '.7z', '.rar')) { return }
      
      $destPath = Join-Path $InstallDir $_.Name
      if($_.PSIsContainer) {
        Copy-Item -Recurse -Force -Path $_.FullName -Destination $destPath
      } else {
        Copy-Item -Force -Path $_.FullName -Destination $destPath
      }
    }
    
    Write-Log "Application files installed successfully." "SUCCESS"
    
  } catch {
    Write-Log "Failed to install application files: $($_.Exception.Message)" "ERROR"
    exit 1
  }
}

function Initialize-Database {
  if($NoMariaDB) { return }
  
  Show-Progress -Activity "Installing SPUDS IMS" -Status "Initializing database" -PercentComplete 90
  
  Write-Log "Initializing database..."
  
  try {
    $mysqldExe = Join-Path $InstallDir "mariadb\bin\mariadbd.exe"
    if(-not (Test-Path $mysqldExe)) {
      $mysqldExe = Join-Path $InstallDir "mariadb\bin\mysqld.exe"
    }
    
    $dataDir = Join-Path $InstallDir "local-mariadb\data"
    
    # Check if data directory is empty
    if((Get-ChildItem -Path $dataDir -Force | Measure-Object).Count -eq 0) {
      Write-Log "Setting up initial database..."
      
      # Initialize database
      $mysqlInstall = Join-Path $InstallDir "mariadb\bin\mariadb-install-db.exe"
      if(-not (Test-Path $mysqlInstall)) {
        $mysqlInstall = Join-Path $InstallDir "mariadb\bin\mysql_install_db.exe"
      }
      
      if(Test-Path $mysqlInstall) {
        & $mysqlInstall --datadir="$dataDir" --service=SPUDS-IMS-DB --port=$DbPort
        Write-Log "Database initialized successfully." "SUCCESS"
      } else {
        Write-Log "Database initialization tool not found. Database may need manual setup." "WARNING"
      }
    } else {
      Write-Log "Database already initialized."
    }
    
  } catch {
    Write-Log "Failed to initialize database: $($_.Exception.Message)" "WARNING"
  }
}

function Show-Completion {
  Show-Progress -Activity "Installing SPUDS IMS" -Status "Installation complete" -PercentComplete 100
  
  Write-Log @"

=====================================
SPUDS IMS Installation Complete!
=====================================

Installation Directory: $InstallDir
Application Port: $Port
Database Port: $DbPort

To start the application:
  1. Run 'quick-start.bat' for automatic startup
  2. Or run 'start-database.bat' then 'start-spuds-ims.bat'

Access the application at: http://localhost:$Port

Installation log: $script:LogFile

=====================================
"@ "SUCCESS"
  
  if($StartAfterInstall) {
    Write-Log "Starting SPUDS IMS..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$(Join-Path $InstallDir 'quick-start.bat')`"" -WorkingDirectory $InstallDir
  }
}

# Main installation flow
function Main {
  Write-Log "Starting SPUDS IMS installation..."
  Write-Log "Installation directory: $InstallDir"
  Write-Log "Silent mode: $Silent"
  Write-Log "Skip MariaDB: $NoMariaDB"
  
  Install-Prerequisites
  Install-Application
  
  $nodeExe = Install-NodeJS
  $mysqldExe = Install-MariaDB
  Configure-MariaDB -MysqldPath $mysqldExe
  
  Create-StartScript
  Create-Shortcuts
  Add-ToPath
  Initialize-Database
  
  Show-Completion
}

# Run installation
Main