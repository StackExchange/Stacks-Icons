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
}