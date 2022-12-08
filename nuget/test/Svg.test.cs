namespace nuget.test;

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
}