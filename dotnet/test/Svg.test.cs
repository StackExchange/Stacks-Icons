namespace StackExchange.StacksIcons.Test;

public class SvgTest
{
    [Fact]
    public void FindsEmbeddedResources()
    {
        var icon = Svg.Accessibility;
        var spot = Svg.Spot.Ads;
        Assert.False(string.IsNullOrWhiteSpace(icon.Value));
        Assert.False(string.IsNullOrWhiteSpace(spot.Value));
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("", "")]
    [InlineData("foo-class", null)]
    [InlineData(null, "foo-title")]
    [InlineData("foo-class", "bar-title")]
    public void With(string? cssClass, string? title)
    {
        // optimized Icons/Placeholder.svg copied here as a stable testing target
        const string template = "<svg aria-hidden=\"true\" class=\"{0}svg-icon iconPlaceholder\" width=\"18\" height=\"18\"  viewBox=\"0 0 18 18\">{1}<path fill=\"var(--white)\" d=\"M0 0h18v18H0z\"/></svg>";

        var svg = new SvgImage(string.Format(template, "", ""));
        var with = svg.With(cssClass, title);

        var expectedClass = string.IsNullOrEmpty(cssClass) ? "" : cssClass + " ";
        var expectedTitle = string.IsNullOrEmpty(title) ? "" : $"<title>{title}</title>";
        var expected = string.Format(template, expectedClass, expectedTitle);

        // if title is set, aria-hidden is removed
        if (!string.IsNullOrEmpty(title))
        {
            expected = expected.Replace("aria-hidden=\"true\"", "");
        }

        Assert.Equal(expected, with.Value);
    }
}