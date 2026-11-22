Add-Type -AssemblyName System.Windows.Forms

$screens = [System.Windows.Forms.Screen]::AllScreens
$list = @()
$idx = 0

foreach ($s in $screens) {
    $list += [PSCustomObject]@{
        index   = $idx
        name    = $s.DeviceName
        primary = $s.Primary
        x       = $s.Bounds.X
        y       = $s.Bounds.Y
        width   = $s.Bounds.Width
        height  = $s.Bounds.Height
    }
    $idx++
}

$list | ConvertTo-Json -Compress
