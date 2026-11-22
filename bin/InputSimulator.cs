using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace PhoneDisplayPro
{
    class InputSimulator
    {
        [DllImport("user32.dll")]
        static extern bool SetCursorPos(int X, int Y);

        [DllImport("user32.dll")]
        static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        const uint MOUSEEVENTF_LEFTDOWN   = 0x0002;
        const uint MOUSEEVENTF_LEFTUP     = 0x0004;
        const uint MOUSEEVENTF_RIGHTDOWN  = 0x0008;
        const uint MOUSEEVENTF_RIGHTUP    = 0x0010;
        const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
        const uint MOUSEEVENTF_MIDDLEUP   = 0x0040;
        const uint MOUSEEVENTF_WHEEL      = 0x0800;

        const uint KEYEVENTF_KEYDOWN = 0x0000;
        const uint KEYEVENTF_KEYUP   = 0x0002;

        static void Main(string[] args)
        {
            // If argument provided, execute single command
            if (args.Length > 0)
            {
                ExecuteCommand(string.Join(" ", args));
                return;
            }

            // Otherwise, read continuously from stdin
            Console.WriteLine("READY");
            string line;
            while ((line = Console.ReadLine()) != null)
            {
                line = line.Trim();
                if (line == "exit" || line == "quit") break;
                if (!string.IsNullOrEmpty(line))
                {
                    ExecuteCommand(line);
                }
            }
        }

        static void ExecuteCommand(string cmd)
        {
            try
            {
                string[] parts = cmd.Split(' ');
                string action = parts[0].ToLowerInvariant();

                switch (action)
                {
                    case "move":
                        if (parts.Length >= 3)
                        {
                            int x = int.Parse(parts[1]);
                            int y = int.Parse(parts[2]);
                            SetCursorPos(x, y);
                        }
                        break;

                    case "down":
                        if (parts.Length >= 2)
                        {
                            string btn = parts[1].ToLowerInvariant();
                            if (btn == "left") mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                            else if (btn == "right") mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, UIntPtr.Zero);
                            else if (btn == "middle") mouse_event(MOUSEEVENTF_MIDDLEDOWN, 0, 0, 0, UIntPtr.Zero);
                        }
                        break;

                    case "up":
                        if (parts.Length >= 2)
                        {
                            string btn = parts[1].ToLowerInvariant();
                            if (btn == "left") mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                            else if (btn == "right") mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
                            else if (btn == "middle") mouse_event(MOUSEEVENTF_MIDDLEUP, 0, 0, 0, UIntPtr.Zero);
                        }
                        break;

                    case "click":
                        string cbtn = parts.Length >= 2 ? parts[1].ToLowerInvariant() : "left";
                        if (cbtn == "left")
                        {
                            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                            Thread.Sleep(10);
                            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                        }
                        else if (cbtn == "right")
                        {
                            mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, UIntPtr.Zero);
                            Thread.Sleep(10);
                            mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
                        }
                        break;

                    case "dblclick":
                        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                        Thread.Sleep(10);
                        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                        Thread.Sleep(50);
                        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                        Thread.Sleep(10);
                        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                        break;

                    case "scroll":
                        if (parts.Length >= 2)
                        {
                            int delta = int.Parse(parts[1]);
                            mouse_event(MOUSEEVENTF_WHEEL, 0, 0, (uint)delta, UIntPtr.Zero);
                        }
                        break;

                    case "key":
                        if (parts.Length >= 2)
                        {
                            byte vk = (byte)int.Parse(parts[1]);
                            keybd_event(vk, 0, KEYEVENTF_KEYDOWN, UIntPtr.Zero);
                            Thread.Sleep(10);
                            keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                        }
                        break;

                    case "text":
                        if (parts.Length >= 2)
                        {
                            string textToSend = cmd.Substring(5);
                            SendKeys.SendWait(textToSend);
                        }
                        break;
                }
            }
            catch
            {
                // Ignore parsing errors for stability
            }
        }
    }
}
