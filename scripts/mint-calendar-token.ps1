<#
  One-time OAuth consent for the Family calendar (issue #27), run by the owner on Windows.

  1. Asks for the OAuth client's ID and secret. Use a "Desktop app" client from
     Google Cloud console > APIs & Services > Credentials.
  2. Opens the browser for calendar.readonly consent. Sign in with the Google
     account that can see the "Family" calendar.
  3. Checks the new token can list calendars and counts the ones named Family.
  4. Adds GCAL_CLIENT_ID, GCAL_CLIENT_SECRET and GCAL_REFRESH_TOKEN as new
     Secret Manager versions, with no trailing newline.

  Nothing secret is printed. Needs gcloud signed in as an owner of the project.
  After it finishes, redeploy the functions so they pin the new versions.

  Usage:  powershell -ExecutionPolicy Bypass -File scripts\mint-calendar-token.ps1
#>
param([string]$Project = 'starboard-family')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Web # HttpUtility, for Windows PowerShell 5.1

$clientId = (Read-Host 'OAuth client ID (ends in .apps.googleusercontent.com)').Trim()
if ($clientId -notmatch '^[\w-]+\.apps\.googleusercontent\.com$') { throw 'That does not look like an OAuth client ID.' }
$secure = Read-Host 'OAuth client secret' -AsSecureString
$clientSecret = [Net.NetworkCredential]::new('', $secure).Password.Trim()

# Loopback redirect: a Desktop app client accepts any localhost port.
$port = Get-Random -Minimum 49152 -Maximum 65535
$redirect = "http://localhost:$port/"
$state = [guid]::NewGuid().ToString('N')
$authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + (@(
    "client_id=$([uri]::EscapeDataString($clientId))"
    "redirect_uri=$([uri]::EscapeDataString($redirect))"
    'response_type=code'
    "scope=$([uri]::EscapeDataString('https://www.googleapis.com/auth/calendar.readonly'))"
    'access_type=offline'
    'prompt=consent'
    "state=$state"
  ) -join '&')

$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add($redirect)
$listener.Start()
try {
  Write-Host 'Opening the browser for consent...'
  Start-Process $authUrl
  $ctx = $listener.GetContext()
  $query = [Web.HttpUtility]::ParseQueryString($ctx.Request.Url.Query)
  $page = [Text.Encoding]::UTF8.GetBytes('<p>Done. You can close this tab and go back to PowerShell.</p>')
  $ctx.Response.OutputStream.Write($page, 0, $page.Length)
  $ctx.Response.Close()
} finally {
  $listener.Stop()
}
if ($query['error']) { throw "Consent failed: $($query['error'])" }
if ($query['state'] -ne $state) { throw 'State mismatch; try again.' }

$token = Invoke-RestMethod -Method Post -Uri 'https://oauth2.googleapis.com/token' -Body @{
  code          = $query['code']
  client_id     = $clientId
  client_secret = $clientSecret
  redirect_uri  = $redirect
  grant_type    = 'authorization_code'
}
if (-not $token.refresh_token) { throw 'Google returned no refresh token. Remove the app at myaccount.google.com/permissions and run this again.' }

$cals = Invoke-RestMethod -Uri 'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250' `
  -Headers @{ Authorization = "Bearer $($token.access_token)" }
$family = @($cals.items | Where-Object {
    @($_.summaryOverride, $_.summary) | Where-Object { $_ -and $_.Trim().ToLower() -eq 'family' }
  }).Count
Write-Host "Token works: $(@($cals.items).Count) calendars visible, $family named Family (the sync needs exactly 1)."
if ($family -ne 1) { Write-Warning 'Fix the calendar sharing or naming before relying on the sync (spec section 7).' }

function Add-SecretVersion([string]$Name, [string]$Value) {
  # A temp file keeps PowerShell from appending a newline to the secret.
  $file = New-TemporaryFile
  try {
    [IO.File]::WriteAllText($file.FullName, $Value)
    gcloud secrets versions add $Name "--data-file=$($file.FullName)" "--project=$Project" --quiet
    if ($LASTEXITCODE) { throw "Could not add a version of $Name." }
  } finally {
    Remove-Item $file.FullName -Force
  }
}
Add-SecretVersion 'GCAL_CLIENT_ID' $clientId
Add-SecretVersion 'GCAL_CLIENT_SECRET' $clientSecret
Add-SecretVersion 'GCAL_REFRESH_TOKEN' $token.refresh_token

Write-Host ''
Write-Host 'Secrets updated. Now redeploy so the function pins the new versions:'
Write-Host '  GitHub > Actions > Deploy functions > Run workflow (on main)'
