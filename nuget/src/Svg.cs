using Microsoft.AspNetCore.Html;
using System;
using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;

namespace StackExchange.StacksIcons;

public static partial class Svg
{
    public static readonly SvgImage Empty = new(string.Empty);

    public static partial class Spot
    {
        /// <summary>
        /// For spots, we intentionally want to bypass the size check on these rarely used items to make maintenance easier.
        /// </summary>
        internal static SvgImage GetImage([CallerMemberName] string? fileName = null) =>
            Svg.GetImage(fileName, isSpot: true, bypassSizeCheck: true);
    }

#if ENTERPRISE
    private const int MaxReasonableSize = 6000;
#else
    private const int MaxReasonableSize = 4500;
#endif

    public const string PathInsideContents = "Img/stacks-icons";

    /// <summary>
    /// A hash that changes when any of the icons change or one gets added, removed, etc. Calculated in GetImage() by replacing this
    /// value with a hash of the old value combined with the file contents. Thus relies on the fact that C# guarantees in-order execution
    /// of static initializers (because the files have to be in the same order every time). The JS uses this value as a cache breaker when
    /// downloading any SVG icon.
    /// </summary>
    public static string CombinedCacheBreaker { get; private set; } = string.Empty;

    /// <summary>
    /// Gets an <see cref="SvgImage"/> for caching and reuse.
    /// </summary>
    /// <param name="fileName">The filename to grab, defaults to the caller's name via <see cref="CallerMemberNameAttribute"/>.</param>
    /// <param name="folder">The folder, if not the root, that this image is in.</param>
    /// <param name="bypassSizeCheck">Whether to allow bypassing the size check, for things we know not to repeat in a page (stil shouldn't be huge).</param>
    /// <returns>The <see cref="SvgImage"/> to cache.</returns>
    internal static SvgImage GetImage([CallerMemberName] string? fileName = null, bool isSpot = false, bool bypassSizeCheck = false)
    {
        if (string.IsNullOrEmpty(fileName))
        {
            return Empty;
        }

        try
        {
            var imageString = Helpers.GetSvg(fileName!, isSpot);

            if (imageString is null)
            {
                throw new Exception("TODO SOMETHING MORE SPECIFIC");
            }
#if DEBUG
            // Okay so now we have the svg asset loaded into the string,
            // if we're on DEBUG let's do some gut checking on the .svg itself.
            // This way we throw in dev.
            if (imageString.Length > MaxReasonableSize && !bypassSizeCheck)
            {
                throw new Exception($"{fileName} is larger than the maximum allowed SVG icon size: {MaxReasonableSize} bytes.");
            }

            if (imageString.Contains("<!--"))
            {
                throw new Exception($"{fileName} contains <!-- --> style comments. Please ensure this file is minified properly.");
            }
#endif
            CombinedCacheBreaker = Helpers.ToSha256Hash(CombinedCacheBreaker + imageString).Substring(0, 12);
            return new SvgImage(imageString);
        }
        catch (Exception ex)
        {
#if DEBUG
            // If the file wasn't able to be loaded at all, we should just throw.
            // This throw should never happen on prod since people should be checking after they add a new SVG
            // and the entry for it in this file, but you know, just in case.
            throw new Exception($"Unable to open {fileName}.svg (isSpot: {isSpot})", ex);
#else
            return Empty;
#endif
        }
    }
}

public class SvgImage : HtmlString
{
    private readonly string _original;
    private readonly ConcurrentDictionary<(string cssClass, string title), HtmlString> cache = new();

    private static readonly Regex AriaHiddenPattern = new("aria-hidden=\"true\"", RegexOptions.IgnoreCase);
    private static readonly Regex SvgOpenTagPattern = new("<svg[^>]*>", RegexOptions.IgnoreCase);

    public SvgImage(string rawData) : base(rawData)
    {
        _original = rawData;
    }

    /// <summary>
    /// Used to add a class to the helper, e.g. .With("native") would add "native" to the class attribute in the SVG.
    /// Used to add a title for accessibility reasons to the helper, e.g. .With("", "some title") would add a title tag with text "some title" to the SVG.
    /// </summary>
    /// <param name="cssClass">The CSS class to append.</param>
    /// <param name="title">The title tag to insert.</param>
    /// <returns>The complete SVG for render, including the added class.</returns>
    public HtmlString With(string? cssClass = null, string? title = null)
    {
        if (string.IsNullOrEmpty(cssClass) && string.IsNullOrEmpty(title))
        {
            return new HtmlString(_original);
        }

        var key = (cssClass, title);
        if (cache.TryGetValue(key!, out var val))
        {
            return val;
        }

        var result = _original;
        result = AppendCssClass(result, cssClass!);
        result = AppendTitle(result, title!);
        cache.TryAdd(key!, new HtmlString(result));

        return new HtmlString(result);
    }

    private static string AppendTitle(string val, string title)
    {
        if (string.IsNullOrEmpty(title))
        {
            return val;
        }

        val = AriaHiddenPattern.Replace(val, string.Empty, count: 1);
        return SvgOpenTagPattern.Replace(val, "$0" + $"<title>{title}</title>", count: 1);
    }

    private static string AppendCssClass(string val, string cssClass)
    {
        if (string.IsNullOrEmpty(cssClass))
        {
            return val;
        }

        const string search = @"class=""";

        // get the first index of `class="` so we can inject our custom classes into it
        var index = val.IndexOf(search, StringComparison.OrdinalIgnoreCase);

        return index > -1 ? val.Insert(index + search.Length, cssClass + " ") : val;
    }
}
