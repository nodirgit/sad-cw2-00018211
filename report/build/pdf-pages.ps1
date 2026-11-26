# Renders each page of the report PDF to PNG with Windows' built-in PDF engine (no install),
# so every page can be looked at. Output: report/build/out/pages/p01.png ...
#   powershell -ExecutionPolicy Bypass -File report\build\pdf-pages.ps1 [-Width 1100]
param([int]$Width = 1100)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFolder, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Pdf.PdfPageRenderOptions, Windows.Data.Pdf, ContentType = WindowsRuntime] | Out-Null

$asTaskOp = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' })[0]
function Await($op, [Type]$t) { $task = $asTaskOp.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
function AwaitAction($a) { $task = $asTaskAction.Invoke($null, @($a)); $task.Wait(-1) | Out-Null }

$pdfPath = (Resolve-Path (Join-Path $PSScriptRoot 'out\SAD_CW2_00018211.pdf')).Path
$outDir = Join-Path $PSScriptRoot 'out\pages'
New-Item -ItemType Directory -Force $outDir | Out-Null
Get-ChildItem $outDir -Filter 'p*.png' | Remove-Item -Force

$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($pdfPath)) ([Windows.Storage.StorageFile])
$pdf = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
$folder = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync((Resolve-Path $outDir).Path)) ([Windows.Storage.StorageFolder])
for ($i = 0; $i -lt $pdf.PageCount; $i++) {
  $page = $pdf.GetPage($i)
  $name = 'p{0:D2}.png' -f ($i + 1)
  $png = Await ($folder.CreateFileAsync($name, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
  $stream = Await ($png.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite)) ([Windows.Storage.Streams.IRandomAccessStream])
  $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $opts.DestinationWidth = [uint32]$Width
  AwaitAction ($page.RenderToStreamAsync($stream, $opts))
  $stream.Dispose()
  $page.Dispose()
}
Write-Output ("Rendered {0} pages to {1}" -f $pdf.PageCount, $outDir)
