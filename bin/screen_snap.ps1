param(
    [int]$screenIndex = 0,
    [int]$quality = 70,
    [string]$outPath = "screen.jpg"
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screens = [System.Windows.Forms.Screen]::AllScreens
if ($screenIndex -ge $screens.Count) { $screenIndex = 0 }
$screen = $screens[$screenIndex]
$bounds = $screen.Bounds

$bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)

try {
    $graphics.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bounds.Size, [System.Drawing.CopyPixelOperation]::SourceCopy)

    $codecs = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()
    $jpegCodec = $codecs | Where-Object { $_.FormatID -eq [System.Drawing.Imaging.ImageFormat]::Jpeg.Guid }

    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)

    $bmp.Save($outPath, $jpegCodec, $encoderParams)
} finally {
    $graphics.Dispose()
    $bmp.Dispose()
}
