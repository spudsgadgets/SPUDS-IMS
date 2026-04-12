param(
  [string]$InstallDir = "",
  [switch]$RemoveData,
  [switch]$KeepData,
  [switch]$Silent
)

# Normalize InstallDir
if([string]::IsNullOrWhiteSpace($InstallDir)) {
  $InstallDir = (Join-Path $env:LOCALAPPDATA "SPUDS-IMS")
} else {
  $InstallDir = [System.IO.Path]::GetFullPath($InstallDir)
}

$ErrorActionPreference = "Continue"
$script:LogFile = Join-Path $env:TEMP "spuds-ims-uninstall.log"

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

function Stop-Processes {
  Write-Log "Stopping SPUDS IMS processes..."
  
  # Stop Node.js processes running our server (using CIM for CommandLine property)
  try {
    $nodeProcs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | Where-Object { 
      $_.CommandLine -like "*server.js*" -and $_.ExecutablePath -like "*$InstallDir*"
    }
    foreach($p in $nodeProcs) {
      Write-Log "Stopping Node process: $($p.ProcessId)"
      Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    }
  } catch {
    # Fallback for older systems
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*$InstallDir*" } | Stop-Process -Force -ErrorAction SilentlyContinue
  }

  # Stop MariaDB processes
  try {
    $dbProcs = Get-CimInstance Win32_Process -Filter "Name = 'mariadbd.exe' OR Name = 'mysqld.exe'" -ErrorAction SilentlyContinue | Where-Object {
      $_.ExecutablePath -like "*$InstallDir*"
    }
    foreach($p in $dbProcs) {
      Write-Log "Stopping MariaDB process: $($p.ProcessId)"
      Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    }
  } catch {
    # Fallback
    Get-Process -Name "mariadbd", "mysqld" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*$InstallDir*" } | Stop-Process -Force -ErrorAction SilentlyContinue
  }
}

function Remove-Shortcuts {
  Write-Log "Removing shortcuts..."
  
  try {
    $WshShell = New-Object -ComObject WScript.Shell
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $programsPath = [Environment]::GetFolderPath("Programs")
    $startMenuPath = [Environment]::GetFolderPath("StartMenu")
    $commonProgramsPath = [Environment]::GetFolderPath("CommonPrograms")
    $commonDesktopPath = [Environment]::GetFolderPath("CommonDesktopDirectory")
    
    # Desktop and Start Menu search areas
    $searchPaths = @(
      $desktopPath,
      $commonDesktopPath,
      (Join-Path $programsPath "SPUDS IMS"),
      (Join-Path $startMenuPath "SPUDS IMS"),
      (Join-Path $commonProgramsPath "SPUDS IMS"),
      $programsPath,
      $startMenuPath,
      $commonProgramsPath
    ) | Where-Object { $_ -and (Test-Path $_) }

    foreach($folder in $searchPaths) {
      if(-not (Test-Path $folder)) { continue }
      
      # If it's a "SPUDS IMS" directory, remove it entirely
      if($folder.EndsWith("SPUDS IMS") -and (Test-Path $folder -PathType Container)) {
        Remove-Item -Path $folder -Recurse -Force -ErrorAction SilentlyContinue
        Write-Log "Removed Start Menu folder: $folder"
        continue
      }

      # Otherwise search for individual shortcuts (.lnk files)
      $links = Get-ChildItem -Path $folder -Filter "*.lnk" -ErrorAction SilentlyContinue
      foreach($lnk in $links) {
        $shouldRemove = $false
        
        # Check by name first
        if($lnk.Name -like "*SPUDS IMS*") {
          $shouldRemove = $true
        } else {
          # Check if the shortcut points to our installation directory
          try {
            $shortcut = $WshShell.CreateShortcut($lnk.FullName)
            if($shortcut.TargetPath -like "*$InstallDir*") {
              $shouldRemove = $true
            }
          } catch {}
        }

        if($shouldRemove) {
          Remove-Item -Path $lnk.FullName -Force -ErrorAction SilentlyContinue
          Write-Log "Removed shortcut: $($lnk.FullName)"
        }
      }
    }
  } catch {
    Write-Log "Failed to remove some shortcuts: $($_.Exception.Message)" "WARNING"
  }
}

function Remove-FromPath {
  if(-not (Test-Admin)) {
    Write-Log "Administrator privileges required to modify system PATH. Skipping..." "WARNING"
    return
  }
  
  Write-Log "Removing from system PATH..."
  
  try {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if($currentPath -like "*$InstallDir*") {
      # Handle both ;DIR and DIR; cases
      $newPath = $currentPath -replace [regex]::Escape(";$InstallDir"), ""
      $newPath = $newPath -replace [regex]::Escape("$InstallDir;"), ""
      $newPath = $newPath -replace [regex]::Escape("$InstallDir"), ""
      
      [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
      Write-Log "Removed from system PATH successfully." "SUCCESS"
    }
  } catch {
    Write-Log "Failed to modify PATH: $($_.Exception.Message)" "WARNING"
  }
}

function Remove-ScheduledTasks {
  Write-Log "Removing scheduled tasks..."
  $taskName = "SPUDS IMS Auto Backup"
  try {
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if($existing) {
      Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
      Write-Log "Removed scheduled task: $taskName"
    }
  } catch {}
}

function Remove-FirewallRules {
  if(-not (Test-Admin)) {
    Write-Log "Administrator privileges required to remove firewall rules. Skipping..." "WARNING"
    return
  }
  
  Write-Log "Removing firewall rules..."
  try {
    # Remove rules starting with "SPUDS IMS"
    $rules = Get-NetFirewallRule -DisplayName "SPUDS IMS*" -ErrorAction SilentlyContinue
    foreach($r in $rules) {
      Remove-NetFirewallRule -Name $r.Name -ErrorAction SilentlyContinue | Out-Null
      Write-Log "Removed firewall rule: $($r.DisplayName)"
    }
  } catch {
    Write-Log "Failed to remove some firewall rules: $($_.Exception.Message)" "WARNING"
  }
}

function Cleanup-Files {
  Write-Log "Cleaning up application files..."
  
  if(-not (Test-Path $InstallDir)) {
    Write-Log "Installation directory not found: $InstallDir"
    return
  }
  
  # Determine if we should remove data
  $finalRemoveData = $RemoveData
  if(-not $Silent -and -not $RemoveData -and -not $KeepData) {
    $title = "Remove Database and Backups?"
    $message = "Do you want to permanently remove the database and backups? If you select 'No', they will be preserved in $InstallDir."
    $yes = New-Object System.Management.Automation.Host.ChoiceDescription "&Yes", "Remove all data."
    $no = New-Object System.Management.Automation.Host.ChoiceDescription "&No", "Keep the database and backups."
    $options = [System.Management.Automation.Host.ChoiceDescription[]]($yes, $no)
    $result = $host.ui.PromptForChoice($title, $message, $options, 1)
    if($result -eq 0) { $finalRemoveData = $true }
  } elseif($KeepData) {
    $finalRemoveData = $false
  }
  
  try {
    if(-not $finalRemoveData) {
      Write-Log "Preserving data and backups."
      $items = Get-ChildItem -Path $InstallDir
      foreach($item in $items) {
        if($item.Name -eq "local-mariadb" -or $item.Name -eq "backups" -or $item.Name -eq "logs") {
          continue
        }
        Remove-Item -Path $item.FullName -Recurse -Force -ErrorAction SilentlyContinue
      }
      Write-Log "Cleaned up app files but kept data."
    } else {
      # Try several times to remove the directory (sometimes processes take a second to fully close)
      for($i=1; $i -le 3; $i++) {
        try {
          Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction Stop
          Write-Log "Successfully removed installation directory." "SUCCESS"
          break
        } catch {
          if($i -eq 3) {
            Write-Log "Could not fully remove directory: $($_.Exception.Message). Some files may be in use." "WARNING"
          } else {
            Write-Log "Retry $($i): Directory in use, waiting..."
            Start-Sleep -Seconds 2
          }
        }
      }
    }
  } catch {
    Write-Log "Failed to cleanup files: $($_.Exception.Message)" "ERROR"
  }
}

function Main {
  Write-Log "Starting SPUDS IMS Uninstallation..."
  Write-Log "Installation directory: $InstallDir"
  
  if(-not (Test-Admin)) {
    Write-Log "Uninstaller is not running with Administrator privileges. Some cleanup tasks may fail." "WARNING"
  }
  
  Stop-Processes
  Remove-Shortcuts
  Remove-FromPath
  Remove-ScheduledTasks
  Remove-FirewallRules
  Cleanup-Files
  
  Write-Log "Uninstallation complete." "SUCCESS"
  
  # Final attempt to cleanup logs in %TEMP% (optional)
  try {
    $installLog = Join-Path $env:TEMP "spuds-ims-install.log"
    if(Test-Path $installLog) { Remove-Item $installLog -Force -ErrorAction SilentlyContinue }
  } catch {}
}

Main
