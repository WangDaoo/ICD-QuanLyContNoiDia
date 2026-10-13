$ErrorActionPreference = 'Stop'
$docxPath = 'D:\Project\Đồ Án 4 +Mobile\10123264 - Dao Minh Quang - Bao cao Mobile ICD.docx'
$pdfPath = 'D:\Project\Đồ Án 4 +Mobile\icd-management\test-artifacts\2026-10-08-mobile-report\identity-final.pdf'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $document = $word.Documents.Open($docxPath, $false, $false)
    try {
        $document.Repaginate()
        [void] $document.Fields.Update()
        for ($i = 1; $i -le $document.TablesOfContents.Count; $i++) {
            $document.TablesOfContents.Item($i).Update()
        }
        for ($i = 1; $i -le $document.TablesOfFigures.Count; $i++) {
            $document.TablesOfFigures.Item($i).Update()
        }
        $document.Repaginate()
        $document.Save()
        $document.ExportAsFixedFormat($pdfPath, 17)
        Write-Output "pages=$($document.ComputeStatistics(2))"
        Write-Output "tocs=$($document.TablesOfContents.Count)"
        Write-Output "figures_lists=$($document.TablesOfFigures.Count)"
        Write-Output "pdf=$pdfPath"
    }
    finally {
        $document.Close(0)
    }
}
finally {
    $word.Quit()
}
