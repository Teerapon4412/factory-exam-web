param(
  [string]$ExcelPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$fullExcelPath = $null
if ($ExcelPath) {
  $fullExcelPath = [System.IO.Path]::GetFullPath((Join-Path $root $ExcelPath))
}
else {
  $candidate = Get-ChildItem -Path $root -Filter *.xlsx | Select-Object -First 1
  if (-not $candidate) {
    throw "No .xlsx file found in project root"
  }
  $fullExcelPath = $candidate.FullName
}
$tempJson = Join-Path $env:TEMP "factory-employees-import.json"

function Get-SharedStrings {
  param($Zip)
  $shared = @()
  $entry = $Zip.GetEntry("xl/sharedStrings.xml")
  if (-not $entry) { return ,$shared }

  $reader = [System.IO.StreamReader]::new($entry.Open())
  try {
    $xml = [xml]$reader.ReadToEnd()
  } finally {
    $reader.Close()
  }

  $ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
  $ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

  foreach ($si in $xml.SelectNodes("//x:sst/x:si", $ns)) {
    $texts = $si.SelectNodes(".//x:t", $ns) | ForEach-Object { $_.'#text' }
    $shared += ($texts -join "")
  }

  return ,$shared
}

function Get-CellValue {
  param($Cell, $SharedStrings, $NamespaceManager)
  if (-not $Cell) { return "" }
  $type = ""
  if ($Cell.Attributes["t"]) { $type = [string]$Cell.Attributes["t"].Value }
  if ($type -eq "s") {
    return $SharedStrings[[int]$Cell.SelectSingleNode("./x:v", $NamespaceManager).InnerText]
  }
  if ($type -eq "inlineStr") {
    $texts = $Cell.SelectNodes(".//x:t", $NamespaceManager) | ForEach-Object { $_.'#text' }
    return ($texts -join "")
  }
  $valueNode = $Cell.SelectSingleNode("./x:v", $NamespaceManager)
  if ($valueNode) { return [string]$valueNode.InnerText }
  return ""
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($fullExcelPath)
try {
  $sharedStrings = Get-SharedStrings -Zip $zip
  $sheetEntry = $zip.GetEntry("xl/worksheets/sheet1.xml")
  if (-not $sheetEntry) {
    throw "sheet1.xml not found in workbook"
  }

  $reader = [System.IO.StreamReader]::new($sheetEntry.Open())
  try {
    $sheetXml = [xml]$reader.ReadToEnd()
  } finally {
    $reader.Close()
  }

  $ns = [System.Xml.XmlNamespaceManager]::new($sheetXml.NameTable)
  $ns.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

  $rows = @()
  foreach ($row in $sheetXml.SelectNodes("//x:worksheet/x:sheetData/x:row", $ns)) {
    if ([int]$row.r -le 1) { continue }

    $cells = @{}
    foreach ($cell in $row.SelectNodes("./x:c", $ns)) {
      $ref = [string]$cell.r
      $col = ($ref -replace "\d", "")
      $cells[$col] = Get-CellValue -Cell $cell -SharedStrings $sharedStrings -NamespaceManager $ns
    }

    $code = ""
    $nameThai = ""
    $nameEng = ""
    if ($cells.ContainsKey("A")) { $code = [string]$cells["A"] }
    if ($cells.ContainsKey("C")) { $nameThai = [string]$cells["C"] }
    if ($cells.ContainsKey("D")) { $nameEng = [string]$cells["D"] }
    if ([string]::IsNullOrWhiteSpace($code) -or [string]::IsNullOrWhiteSpace($nameThai)) {
      continue
    }

    $rows += [pscustomobject]@{
      employeeCode = $code.Trim()
      fullName = $nameThai.Trim()
      englishName = $nameEng.Trim()
      role = "USER"
      isActive = $true
      department = ""
      position = ""
    }
  }

  $rows | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $tempJson
  Write-Host "Parsed employees:" $rows.Count
  & node (Join-Path $PSScriptRoot "upsert-employees.mjs") $tempJson
}
finally {
  $zip.Dispose()
}
