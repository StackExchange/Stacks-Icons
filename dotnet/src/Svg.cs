using Microsoft.AspNetCore.Html;
using System;
using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;

namespace StackExchange.StacksIcons;

public static partial class Svg
{
    private const int MaxReasonableSize = 4500;
    public static readonly SvgImage Empty = new(string.Empty);

    public static partial class Spot
    {
        /// <inheritdoc cref="Svg.GetImage(string?, bool, bool)"/>
        internal static SvgImage GetImage([CallerMemberName] string? fileName = null) =>
            // For spots, we intentionally want to bypass the size check on these rarely used items to make maintenance easier.
            Svg.GetImage(fileName, isSpot: true, bypassSizeCheck: true);
    }

    /// <summary>
    /// Gets an <see cref="SvgImage"/> for caching and reuse.
    /// </summary>
    /// <param name="fileName">The filename to grab, defaults to the caller's name via <see cref="CallerMemberNameAttribute"/>.</param>
    /// <param name="isSpot">Whether the image is a Spot or not.</param>
    /// <param name="bypassSizeCheck">Whether to allow bypassing the size check, for things we know not to repeat in a page (still shouldn't be huge).</param>
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
#if DEBUG
            // Okay so now we have the svg asset loaded into the string,
            // if we're on DEBUG let's do some gut checking on the .svg itself.
            // This way we throw in dev.
            if (imageString is null)
            {
                throw new Exception($"Unable to find {fileName} in embedded resources.");
            }

            if (imageString.Length > MaxReasonableSize && !bypassSizeCheck)
            {
                throw new Exception($"{fileName} is larger than the maximum allowed SVG icon size: {MaxReasonableSize} bytes.");
            }

            if (imageString.Contains("<!--"))
            {
                throw new Exception($"{fileName} contains <!-- --> style comments. Please ensure this file is minified properly.");
            }
#endif
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

/// <summary>
/// Describes an svg image string that is sanitized for use in Html
/// </summary>
public class SvgImage : HtmlString
{
    private readonly string _original;
    private readonly ConcurrentDictionary<(string cssClass, string title), HtmlString> cache = new();

    private static readonly Regex AriaHiddenPattern = new("aria-hidden=\"true\"", RegexOptions.IgnoreCase);
    private static readonly Regex SvgOpenTagPattern = new("<svg[^>]*>", RegexOptions.IgnoreCase);

    public SvgImage(string? rawData) : base(rawData)
    {
        _original = rawData ?? string.Empty;
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

    /// <summary>
    /// Adds a &lt;title&gt; element to the svg
    /// </summary>
    /// <param name="svg">The entire svg string</param>
    /// <param name="title">The title text to add</param>
    private static string AppendTitle(string svg, string title)
    {
        if (string.IsNullOrEmpty(title))
        {
            return svg;
        }

        svg = AriaHiddenPattern.Replace(svg, string.Empty, count: 1);
        return SvgOpenTagPattern.Replace(svg, "$0" + $"<title>{title}</title>", count: 1);
    }

    /// <summary>
    /// Adds css classes to the svg element
    /// </summary>
    /// <param name="svg">The entire svg string</param>
    /// <param name="cssClass">The css class string to add to the existing svg classes</param>
    private static string AppendCssClass(string svg, string cssClass)
    {
        if (string.IsNullOrEmpty(cssClass))
        {
            return svg;
        }

        const string search = @"class=""";

        // get the first index of `class="` so we can inject our custom classes into it
        var index = svg.IndexOf(search, StringComparison.OrdinalIgnoreCase);

        return index > -1 ? svg.Insert(index + search.Length, cssClass + " ") : svg;
    }
}
