$ErrorActionPreference = 'Stop'
$certDirectory = Join-Path $PSScriptRoot '../.certs'
New-Item -ItemType Directory -Force -Path $certDirectory | Out-Null
$certPath = Join-Path $certDirectory 'localhost.pem'
$keyPath = Join-Path $certDirectory 'localhost-key.pem'
if ((Test-Path $certPath) -and (Test-Path $keyPath)) { exit 0 }

$rsa = [System.Security.Cryptography.RSA]::Create(2048)
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
    $certificate = $request.CreateSelfSigned([DateTimeOffset]::Now.AddDays(-1), [DateTimeOffset]::Now.AddYears(1))
    [System.IO.File]::WriteAllText($keyPath, $rsa.ExportPkcs8PrivateKeyPem())
    [System.IO.File]::WriteAllText($certPath, $certificate.ExportCertificatePem())
    $certificate.Dispose()
    Write-Host 'Created local HTTPS certificate in .certs (self-signed; not installed in your trust store).'
} finally { $rsa.Dispose() }
