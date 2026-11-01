$ErrorActionPreference = 'Stop'
$certDirectory = Join-Path $PSScriptRoot '../.certs'
New-Item -ItemType Directory -Force -Path $certDirectory | Out-Null
$certPath = Join-Path $certDirectory 'localhost.pem'
$keyPath = Join-Path $certDirectory 'localhost-key.pem'
if ((Test-Path $certPath) -and (Test-Path $keyPath)) { exit 0 }

# Preserve the existing 2048-bit local-development key format.
$rsaKeyBits = 2048
# Backdate one day to tolerate clock skew; refresh this local certificate yearly.
$certificateBackdateDays = -1
$certificateLifetimeYears = 1
$rsa = [System.Security.Cryptography.RSA]::Create($rsaKeyBits)
try {
    $request = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new(
        'CN=Emberfall local development', $rsa,
        [System.Security.Cryptography.HashAlgorithmName]::SHA256,
        [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
    $names = [System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
    $names.AddDnsName('localhost')
    $names.AddIpAddress([System.Net.IPAddress]::Loopback)
    $names.AddIpAddress([System.Net.IPAddress]::IPv6Loopback)
    foreach ($address in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces().GetIPProperties().UnicastAddresses.Address) {
        if ($address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork) { $names.AddIpAddress($address) }
    }
    $request.CertificateExtensions.Add($names.Build())
    $certificate = $request.CreateSelfSigned([DateTimeOffset]::Now.AddDays($certificateBackdateDays), [DateTimeOffset]::Now.AddYears($certificateLifetimeYears))
    [System.IO.File]::WriteAllText($keyPath, $rsa.ExportPkcs8PrivateKeyPem())
    [System.IO.File]::WriteAllText($certPath, $certificate.ExportCertificatePem())
    $certificate.Dispose()
    Write-Host 'Created local HTTPS certificate in .certs (self-signed; not installed in your trust store).'
} finally { $rsa.Dispose() }
