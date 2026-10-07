$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
function Get-MobileLuminance([string]$Hex) {
  $mobileRgb = 1,3,5 | ForEach-Object { [Convert]::ToInt32($Hex.Substring($_,2),16)/255 }
  $mobileLinear = $mobileRgb | ForEach-Object {if ($_ -le 0.04045) {$_/12.92} else {[Math]::Pow((($_+0.055)/1.055),2.4)}}
  return 0.2126*$mobileLinear[0]+0.7152*$mobileLinear[1]+0.0722*$mobileLinear[2]
}
$mobilePairs = @(
  @{name='Light session success text';file='01-gate-out-light.png';foreground='#059669';background='#ECFDF5';rect=@(808,261,1016,310);normalText=$true},
  @{name='Dark logout text';file='54-logout-confirm-dark.png';foreground='#FFFFFF';background='#FB7185';rect=@(87,973,993,1078);normalText=$true},
  @{name='Light logout text';file='52-logout-confirm-light.png';foreground='#FFFFFF';background='#DC2626';rect=@(87,973,993,1078);normalText=$true},
  @{name='Light readiness warning text';file='07-container-detail-light.png';foreground='#D97706';background='#FFFBEB';rect=@(76,1510,450,1600);normalText=$true},
  @{name='Dark session success text';file='37-workqueue-dark.png';foreground='#34D399';background='#063E33';rect=@(808,261,1016,310);normalText=$true},
  @{name='Light body text';file='03-yard-light.png';foreground='#0F172A';background='#FFFFFF';rect=@(76,474,1004,546);normalText=$true},
  @{name='Dark body text';file='19-survey-dark.png';foreground='#F8FAFC';background='#172033';rect=@(76,474,1004,546);normalText=$true}
)
$mobileResult = foreach ($mobilePair in $mobilePairs) {
  $mobileBmp = New-Object System.Drawing.Bitmap((Join-Path (Get-Location) ('audit/screenshots/baseline/mobile/'+$mobilePair.file)))
  $mobileFgCount=0; $mobileBgCount=0
  for($mobileY=$mobilePair.rect[1];$mobileY -lt $mobilePair.rect[3];$mobileY++) {for($mobileX=$mobilePair.rect[0];$mobileX -lt $mobilePair.rect[2];$mobileX++) {
    $mobilePixel=$mobileBmp.GetPixel($mobileX,$mobileY)
    $mobileHex='#{0:X2}{1:X2}{2:X2}' -f $mobilePixel.R,$mobilePixel.G,$mobilePixel.B
    if($mobileHex -eq $mobilePair.foreground){$mobileFgCount++};if($mobileHex -eq $mobilePair.background){$mobileBgCount++}
  }}
  $mobileL1=Get-MobileLuminance $mobilePair.foreground; $mobileL2=Get-MobileLuminance $mobilePair.background
  $mobileRatio=([Math]::Max($mobileL1,$mobileL2)+0.05)/([Math]::Min($mobileL1,$mobileL2)+0.05)
  [pscustomobject]@{name=$mobilePair.name;screenshot='audit/screenshots/baseline/mobile/'+$mobilePair.file;rect=$mobilePair.rect;foreground=$mobilePair.foreground;background=$mobilePair.background;exactForegroundPixels=$mobileFgCount;exactBackgroundPixels=$mobileBgCount;contrast=[Math]::Round($mobileRatio,4);normalThreshold=4.5;largeThreshold=3;nativeVerified=($mobileFgCount -gt 0 -and $mobileBgCount -gt 0);status=if($mobileFgCount -eq 0 -or $mobileBgCount -eq 0){'UNKNOWN'}elseif($mobileRatio -ge 4.5){'PASS'}else{'FAIL'}}
  $mobileBmp.Dispose()
}
$mobileResult | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 audit/raw/baseline/mobile/contrast-measurements.json
$mobileResult | ConvertTo-Json -Depth 4
