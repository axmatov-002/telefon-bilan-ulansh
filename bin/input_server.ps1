Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$code = @"
using System;
using System.Runtime.InteropServices;

public class Win32Input {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern bool LockWorkStation();

    public const uint MOUSEEVENTF_LEFTDOWN   = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP     = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN  = 0x0008;
    public const uint MOUSEEVENTF_RIGHTUP    = 0x0010;
    public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
    public const uint MOUSEEVENTF_MIDDLEUP   = 0x0040;
    public const uint MOUSEEVENTF_WHEEL      = 0x0800;

    public const uint KEYEVENTF_EXTENDEDKEY  = 0x0001;
    public const uint KEYEVENTF_KEYUP        = 0x0002;

    public static void LeftClick() {
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
    }
    public static void RightClick() {
        mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, UIntPtr.Zero);
        mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
    }
    public static void MouseDown(string btn) {
        if (btn == "left") mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
        else if (btn == "right") mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, UIntPtr.Zero);
    }
    public static void MouseUp(string btn) {
        if (btn == "left") mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
        else if (btn == "right") mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
    }
    public static void Scroll(int delta) {
        mouse_event(MOUSEEVENTF_WHEEL, 0, 0, (uint)delta, UIntPtr.Zero);
    }

    public static void KeyStroke(byte vk) {
        keybd_event(vk, 0, KEYEVENTF_EXTENDEDKEY, UIntPtr.Zero);
        keybd_event(vk, 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    public static void KeyCombo2(byte mod, byte vk) {
        keybd_event(mod, 0, 0, UIntPtr.Zero);
        keybd_event(vk, 0, 0, UIntPtr.Zero);
        keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(mod, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }

    public static void KeyCombo3(byte mod1, byte mod2, byte vk) {
        keybd_event(mod1, 0, 0, UIntPtr.Zero);
        keybd_event(mod2, 0, 0, UIntPtr.Zero);
        keybd_event(vk, 0, 0, UIntPtr.Zero);
        keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(mod2, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(mod1, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }
}
"@

Add-Type -TypeDefinition $code

Write-Output "READY"

while ($line = [Console]::ReadLine()) {
    $line = $line.Trim()
    if ($line -eq "QUIT" -or $line -eq "EXIT") { break }
    if ([string]::IsNullOrEmpty($line)) { continue }

    try {
        $parts = $line.Split(" ")
        $cmd = $parts[0].ToUpper()

        switch ($cmd) {
            "MOVE" {
                $x = [int]$parts[1]
                $y = [int]$parts[2]
                [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x, $y)
            }
            "CLICK" {
                $btn = if ($parts.Length -gt 1) { $parts[1].ToLower() } else { "left" }
                if ($btn -eq "right") { [Win32Input]::RightClick() }
                else { [Win32Input]::LeftClick() }
            }
            "DOWN" {
                $btn = if ($parts.Length -gt 1) { $parts[1].ToLower() } else { "left" }
                [Win32Input]::MouseDown($btn)
            }
            "UP" {
                $btn = if ($parts.Length -gt 1) { $parts[1].ToLower() } else { "left" }
                [Win32Input]::MouseUp($btn)
            }
            "SCROLL" {
                $delta = [int]$parts[1]
                [Win32Input]::Scroll($delta)
            }
            "TEXT" {
                $text = $line.Substring(5)
                [System.Windows.Forms.SendKeys]::SendWait($text)
            }
            "HOTKEY" {
                $action = $parts[1].ToUpper()
                switch ($action) {
                    "VOL_UP"       { [Win32Input]::KeyStroke(0xAF) } # VK_VOLUME_UP
                    "VOL_DOWN"     { [Win32Input]::KeyStroke(0xAE) } # VK_VOLUME_DOWN
                    "MUTE"         { [Win32Input]::KeyStroke(0xAD) } # VK_VOLUME_MUTE
                    "PLAY_PAUSE"   { [Win32Input]::KeyStroke(0xB3) } # VK_MEDIA_PLAY_PAUSE
                    "NEXT_TRACK"   { [Win32Input]::KeyStroke(0xB0) } # VK_MEDIA_NEXT_TRACK
                    "PREV_TRACK"   { [Win32Input]::KeyStroke(0xB1) } # VK_MEDIA_PREV_TRACK
                    "WIN_D"        { [Win32Input]::KeyCombo2(0x5B, 0x44) } # Win + D (Desktop)
                    "WIN_E"        { [Win32Input]::KeyCombo2(0x5B, 0x45) } # Win + E (Explorer)
                    "WIN_TAB"      { [Win32Input]::KeyCombo2(0x5B, 0x09) } # Win + Tab (Task View)
                    "ALT_TAB"      { [Win32Input]::KeyCombo2(0x12, 0x09) } # Alt + Tab
                    "ALT_F4"       { [Win32Input]::KeyCombo2(0x12, 0x73) } # Alt + F4
                    "TASK_MGR"     { [Win32Input]::KeyCombo3(0x11, 0x10, 0x1B) } # Ctrl + Shift + Esc
                    "START"        { [Win32Input]::KeyStroke(0x5B) } # Windows Key
                    "LOCK"         { [Win32Input]::LockWorkStation() } # Lock Workstation
                    "ESC"          { [Win32Input]::KeyStroke(0x1B) }
                    "ENTER"        { [Win32Input]::KeyStroke(0x0D) }
                    "BACKSPACE"    { [Win32Input]::KeyStroke(0x08) }
                    "SPACE"        { [Win32Input]::KeyStroke(0x20) }
                }
            }
        }
    } catch {
        # ignore error to keep loop alive
    }
}