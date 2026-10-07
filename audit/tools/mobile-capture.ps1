param([Parameter(Mandatory=$true)][string]$Name)
$ErrorActionPreference = 'Stop'
$mobileAdb = 'C:\Users\quang\AppData\Local\Android\Sdk\platform-tools\adb.exe'
Start-Sleep -Milliseconds 800
$mobileDump = & $mobileAdb -s emulator-5554 shell uiautomator dump "/sdcard/mobile-$Name.xml" 2>&1
if ($mobileDump -notmatch 'dumped to') { throw "UI XML capture failed for $Name : $mobileDump" }
& $mobileAdb -s emulator-5554 pull "/sdcard/mobile-$Name.xml" "audit/raw/baseline/mobile/$Name.xml" 2>$null | Out-Null
& $mobileAdb -s emulator-5554 shell screencap -p /sdcard/mobile-audit.png
& $mobileAdb -s emulator-5554 pull /sdcard/mobile-audit.png "audit/screenshots/baseline/mobile/$Name.png" 2>$null | Out-Null
[xml]$mobileTree = Get-Content -Raw -LiteralPath "audit/raw/baseline/mobile/$Name.xml"
$mobileNodes = foreach ($mobileNode in $mobileTree.SelectNodes('//node')) {
  if ($mobileNode.text -or $mobileNode.'content-desc' -or $mobileNode.clickable -eq 'true' -or $mobileNode.class -eq 'android.widget.EditText') {
    [pscustomobject]@{text=$mobileNode.text; label=$mobileNode.'content-desc'; bounds=$mobileNode.bounds; enabled=$mobileNode.enabled; clickable=$mobileNode.clickable; focusable=$mobileNode.focusable; selected=$mobileNode.selected; class=$mobileNode.class}
  }
}
$mobileNodes | ConvertTo-Json -Depth 3 | Set-Content -Encoding UTF8 -LiteralPath "audit/raw/baseline/mobile/$Name-nodes.json"
$mobileNodes | ForEach-Object { "$($_.bounds) | $($_.label) | $($_.text.Substring(0,[Math]::Min(100,$_.text.Length))) | enabled=$($_.enabled) selected=$($_.selected)" }
