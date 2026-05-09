param(
  [string]$AzureAccount = "mohamed_wahid2007@alexu.edu.eg",
  [string]$ResourceGroup = "rg-smartretailpro",
  [string]$Location = "westeurope",
  [string]$ProjectName = "smartretailpro",
  [string]$SqlAdminLogin = "sqladminuser",
  [string]$AppServiceSku = "B1"
)

$ErrorActionPreference = "Stop"

function Require-Command($name, $message) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw $message
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$infraFile = Join-Path $repoRoot "azure\infra\main.bicep"
$distRoot = Join-Path $repoRoot "azure\dist"
$webDist = Join-Path $distRoot "webapp"
$zipFile = Join-Path $distRoot "smartretailpro-azure-webapp.zip"

Require-Command az "Azure CLI is not installed. Install it first from Microsoft, then rerun this script."

Write-Host "Checking Azure login..."
$accountJson = $null
try {
  $accountJson = az account show --only-show-errors | ConvertFrom-Json
} catch {
  Write-Host "No active Azure login. Starting device-code login for $AzureAccount ..."
  az login --use-device-code --only-show-errors
  $accountJson = az account show --only-show-errors | ConvertFrom-Json
}

Write-Host "Current Azure account: $($accountJson.user.name)"
if ($accountJson.user.name -ne $AzureAccount) {
  Write-Warning "The active Azure account is not $AzureAccount. Continue only if this is intentional."
}

Write-Host "Creating resource group $ResourceGroup in $Location ..."
az group create --name $ResourceGroup --location $Location --only-show-errors | Out-Null

$securePassword = Read-Host "Enter a strong Azure SQL admin password" -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
if ([string]::IsNullOrWhiteSpace($plainPassword)) {
  throw "SQL password cannot be empty."
}

Write-Host "Deploying Azure infrastructure..."
$deploymentName = "smartretailpro-$(Get-Date -Format yyyyMMddHHmmss)"
$deployment = az deployment group create `
  --resource-group $ResourceGroup `
  --name $deploymentName `
  --template-file $infraFile `
  --parameters location=$Location projectName=$ProjectName sqlAdminLogin=$SqlAdminLogin sqlAdminPassword=$plainPassword appServiceSku=$AppServiceSku `
  --only-show-errors | ConvertFrom-Json

$webAppName = $deployment.properties.outputs.webAppName.value
$webUrl = $deployment.properties.outputs.webUrl.value

Write-Host "Preparing web application package..."
if (Test-Path $distRoot) {
  Remove-Item -LiteralPath $distRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $webDist | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $webDist "app") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $webDist "azure") | Out-Null

Copy-Item -Path (Join-Path $repoRoot "azure\web\*") -Destination $webDist -Recurse -Force
Copy-Item -Path (Join-Path $repoRoot "app\public") -Destination (Join-Path $webDist "app\public") -Recurse -Force
Copy-Item -Path (Join-Path $repoRoot "app\sql") -Destination (Join-Path $webDist "app\sql") -Recurse -Force
Copy-Item -Path (Join-Path $repoRoot "azure\infra") -Destination (Join-Path $webDist "azure\infra") -Recurse -Force
Copy-Item -Path (Join-Path $repoRoot "azure\scripts") -Destination (Join-Path $webDist "azure\scripts") -Recurse -Force
Copy-Item -Path (Join-Path $repoRoot "docs") -Destination (Join-Path $webDist "docs") -Recurse -Force

Compress-Archive -Path (Join-Path $webDist "*") -DestinationPath $zipFile -CompressionLevel Optimal

Write-Host "Deploying web application to App Service $webAppName ..."
az webapp deploy `
  --resource-group $ResourceGroup `
  --name $webAppName `
  --src-path $zipFile `
  --type zip `
  --only-show-errors | Out-Null

az webapp config set `
  --resource-group $ResourceGroup `
  --name $webAppName `
  --startup-file "node server.mjs" `
  --only-show-errors | Out-Null

Write-Host ""
Write-Host "Azure deployment completed."
Write-Host "Web URL: $webUrl"
Write-Host ""
Write-Host "Open the URL, then use the GUI tab: تشغيل المشروع -> تشغيل الآن"
Write-Host "This will generate Data Lake files and load Azure SQL."
