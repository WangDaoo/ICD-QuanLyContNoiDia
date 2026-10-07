$ErrorActionPreference = 'Stop'
$mobileAdb = 'C:\Users\quang\AppData\Local\Android\Sdk\platform-tools\adb.exe'
function Wait-MobileReady {
  $mobileDeadline = (Get-Date).AddSeconds(45)
  do {
    & $mobileAdb -s emulator-5554 shell uiautomator dump /sdcard/reaudit-ready.xml 2>$null | Out-Null
    & $mobileAdb -s emulator-5554 pull /sdcard/reaudit-ready.xml audit/raw/re-audit/mobile/ready-current.xml 2>$null | Out-Null
    $mobileReadyXml = Get-Content -Raw audit/raw/re-audit/mobile/ready-current.xml
    if ($mobileReadyXml -match 'content-desc="Chuyển sang nền (sáng|tối)"') { return }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $mobileDeadline)
  throw 'The existing Expo session did not become ready within 45 seconds.'
}
function Save-MobileCapture([string]$Name) {
  Start-Sleep -Milliseconds 600
  $dump = & $mobileAdb -s emulator-5554 shell uiautomator dump "/sdcard/reaudit-$Name.xml" 2>&1
  if ($dump -notmatch 'dumped to') { throw "Capture failed: $Name $dump" }
  & $mobileAdb -s emulator-5554 pull "/sdcard/reaudit-$Name.xml" "audit/raw/re-audit/mobile/$Name.xml" 2>$null | Out-Null
  & $mobileAdb -s emulator-5554 shell screencap -p /sdcard/reaudit-mobile.png
  & $mobileAdb -s emulator-5554 pull /sdcard/reaudit-mobile.png "audit/screenshots/re-audit/mobile/$Name.png" 2>$null | Out-Null
  [xml]$tree = Get-Content -Raw -LiteralPath "audit/raw/re-audit/mobile/$Name.xml"
  if (!$tree.SelectNodes('//node[@package="host.exp.exponent" and @clickable="true"]').Count) { throw "Capture has no app controls: $Name" }
  $rows = foreach ($node in $tree.SelectNodes('//node')) {
    if ($node.text -or $node.'content-desc' -or $node.clickable -eq 'true') {
      [pscustomobject]@{text=$node.text;label=$node.'content-desc';bounds=$node.bounds;clickable=$node.clickable;enabled=$node.enabled;class=$node.class}
    }
  }
  $rows | ConvertTo-Json -Depth 3 | Set-Content -Encoding utf8 "audit/raw/re-audit/mobile/$Name-nodes.json"
  $rows | Where-Object { $_.clickable -eq 'true' -or $_.class -eq 'android.widget.EditText' } | ForEach-Object { "$($_.bounds) | $($_.label) | $($_.text) | $($_.enabled)" }
}
function Tap-MobileLabel([string]$Label) {
  & $mobileAdb -s emulator-5554 shell uiautomator dump /sdcard/reaudit-tap.xml 2>$null | Out-Null
  & $mobileAdb -s emulator-5554 pull /sdcard/reaudit-tap.xml audit/raw/re-audit/mobile/tap-current.xml 2>$null | Out-Null
  [xml]$tree = Get-Content -Raw audit/raw/re-audit/mobile/tap-current.xml
  $node = $tree.SelectNodes('//node') | Where-Object { $_.'content-desc' -eq $Label -and $_.clickable -eq 'true' } | Select-Object -First 1
  if (!$node) { throw "No visible clickable label: $Label" }
  $coords = [regex]::Matches($node.bounds, '\d+') | ForEach-Object { [int]$_.Value }
  & $mobileAdb -s emulator-5554 shell input tap ([int](($coords[0]+$coords[2])/2)) ([int](($coords[1]+$coords[3])/2))
}
