using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Threading;
using System.Windows.Forms;

namespace PhoneDisplayPro
{
    class ScreenCapture
    {
        static void Main(string[] args)
        {
            // Set binary mode for standard output
            Stream stdout = Console.OpenStandardOutput();

            int screenIndex = 0;
            int fps = 30;
            int quality = 70;

            if (args.Length > 0) int.TryParse(args[0], out screenIndex);
            if (args.Length > 1 && args[1] == "once")
            {
                // Single snapshot mode
                if (args.Length > 2) int.TryParse(args[2], out quality);
                string outPath = args.Length > 3 ? args[3] : "screen.jpg";
                CaptureSingle(screenIndex, quality, outPath);
                return;
            }

            if (args.Length > 1) int.TryParse(args[1], out fps);
            if (args.Length > 2) int.TryParse(args[2], out quality);

            if (fps <= 0) fps = 30;
            if (fps > 60) fps = 60;
            if (quality < 10) quality = 10;
            if (quality > 100) quality = 100;

            int delayMs = 1000 / fps;

            var screens = Screen.AllScreens;
            if (screenIndex < 0 || screenIndex >= screens.Length)
            {
                screenIndex = 0;
            }

            Rectangle bounds = screens[screenIndex].Bounds;
            ImageCodecInfo jpgEncoder = GetEncoder(ImageFormat.Jpeg);
            EncoderParameters encParams = new EncoderParameters(1);
            encParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, (long)quality);

            byte[] lenBuffer = new byte[4];

            using (Bitmap bmp = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format24bppRgb))
            using (Graphics g = Graphics.FromImage(bmp))
            using (MemoryStream ms = new MemoryStream(1024 * 512))
            {
                while (true)
                {
                    try
                    {
                        var start = Environment.TickCount;

                        // Copy screen to bitmap
                        g.CopyFromScreen(bounds.X, bounds.Y, 0, 0, bounds.Size, CopyPixelOperation.SourceCopy);

                        // Save JPEG to memory stream
                        ms.SetLength(0);
                        bmp.Save(ms, jpgEncoder, encParams);
                        byte[] bytes = ms.ToArray();
                        int len = bytes.Length;

                        // Write 4-byte header length (Little Endian)
                        lenBuffer[0] = (byte)(len & 0xFF);
                        lenBuffer[1] = (byte)((len >> 8) & 0xFF);
                        lenBuffer[2] = (byte)((len >> 16) & 0xFF);
                        lenBuffer[3] = (byte)((len >> 24) & 0xFF);

                        stdout.Write(lenBuffer, 0, 4);
                        stdout.Write(bytes, 0, len);
                        stdout.Flush();

                        int elapsed = Environment.TickCount - start;
                        int sleep = delayMs - elapsed;
                        if (sleep > 0) Thread.Sleep(sleep);
                    }
                    catch (Exception)
                    {
                        break;
                    }
                }
            }
        }

        static void CaptureSingle(int screenIndex, int quality, string outputPath)
        {
            var screens = Screen.AllScreens;
            if (screenIndex < 0 || screenIndex >= screens.Length) screenIndex = 0;
            Rectangle bounds = screens[screenIndex].Bounds;

            using (Bitmap bmp = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format24bppRgb))
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.CopyFromScreen(bounds.X, bounds.Y, 0, 0, bounds.Size, CopyPixelOperation.SourceCopy);
                ImageCodecInfo jpgEncoder = GetEncoder(ImageFormat.Jpeg);
                EncoderParameters encParams = new EncoderParameters(1);
                encParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, (long)quality);
                bmp.Save(outputPath, jpgEncoder, encParams);
            }
        }

        static ImageCodecInfo GetEncoder(ImageFormat format)
        {
            ImageCodecInfo[] codecs = ImageCodecInfo.GetImageDecoders();
            foreach (ImageCodecInfo codec in codecs)
            {
                if (codec.FormatID == format.Guid)
                {
                    return codec;
                }
            }
            return null;
        }
    }
}
