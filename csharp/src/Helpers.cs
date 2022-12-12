using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;

namespace StackExchange.StacksIcons;

internal static class Helpers
{
    private static readonly Assembly Assembly;
    private static readonly string AssemblyName;

    static Helpers()
    {
        Assembly = typeof(Svg).Assembly;
        AssemblyName = Assembly.GetName().Name!;
    }

    internal static string? GetSvg(string name, bool isSpot)
    {
        var path = isSpot ? "Spot" : "Icon";
        var filename = $"{AssemblyName}.{path}.{name}.svg";
        var stream = Assembly.GetManifestResourceStream(filename);

        if (stream is null)
        {
            return null;
        }

        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    internal static string ToSha256Hash(string s)
    {
        using var mySHA256 = SHA256.Create();
        var bytes = mySHA256.ComputeHash(Encoding.UTF8.GetBytes(s));

        var str = new StringBuilder();

        foreach (var b in bytes)
        {
            str.Append(b.ToString("X2"));
        }

        return str.ToString();
    }
}