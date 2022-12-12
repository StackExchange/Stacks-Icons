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

    [Fact]
    public void CombinedCacheBreaker()
    {
        Assert.False(string.IsNullOrEmpty(Svg.CombinedCacheBreaker));
    }
}