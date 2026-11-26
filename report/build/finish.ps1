# Opens the built report in Word, fills in the contents page and page numbers, saves it,
# and writes a PDF to report/build/out/ for checking. Run after "npm run build":
#   powershell -ExecutionPolicy Bypass -File report\build\finish.ps1
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$docx = (Join-Path $root 'report\SAD_CW2_00018211.docx').ToString()
$outDir = Join-Path $PSScriptRoot 'out'
New-Item -ItemType Directory -Force $outDir | Out-Null
$pdf = (Join-Path $outDir 'SAD_CW2_00018211.pdf').ToString()
$log = Join-Path $outDir 'finish.log'
function Step($m) { Add-Content -Path $log -Value ("{0:HH:mm:ss} {1}" -f (Get-Date), $m) }
Set-Content -Path $log -Value ''

# A lock file left by a Word that was closed abruptly makes Word ask "file in use" behind the scenes.
$lock = Join-Path $root 'report\~$D_CW2_00018211.docx'
if ((Test-Path -LiteralPath $lock) -and -not (Get-Process WINWORD -ErrorAction SilentlyContinue)) { Remove-Item -LiteralPath $lock -Force }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  Step 'open'
  $doc = $word.Documents.Open($docx, $false, $false, $false)
  Step 'update contents'
  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  Step 'save docx'
  $doc.Save()
  Step 'save pdf'
  $doc.SaveAs2($pdf, 17)
  Step 'count pages'
  Write-Output ("Pages: " + $doc.ComputeStatistics(2))
  $doc.Close($false)
  Step 'done'
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}
Write-Output "Saved $docx (contents page updated) and $pdf"
