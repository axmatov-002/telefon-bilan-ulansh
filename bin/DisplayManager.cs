using System;
using System.Windows.Forms;
using System.Text;

namespace PhoneDisplayPro
{
    class DisplayManager
    {
        static void Main(string[] args)
        {
            var screens = Screen.AllScreens;
            StringBuilder sb = new StringBuilder();
            sb.Append("[");
            for (int i = 0; i < screens.Length; i++)
            {
                var s = screens[i];
                sb.Append("{");
                sb.AppendFormat("\"index\":{0},", i);
                sb.AppendFormat("\"name\":\"{0}\",", s.DeviceName.Replace("\\", "\\\\"));
                sb.AppendFormat("\"primary\":{0},", s.Primary ? "true" : "false");
                sb.AppendFormat("\"x\":{0},", s.Bounds.X);
                sb.AppendFormat("\"y\":{0},", s.Bounds.Y);
                sb.AppendFormat("\"width\":{0},", s.Bounds.Width);
                sb.AppendFormat("\"height\":{0}", s.Bounds.Height);
                sb.Append("}");
                if (i < screens.Length - 1) sb.Append(",");
            }
            sb.Append("]");
            Console.WriteLine(sb.ToString());
        }
    }
}
