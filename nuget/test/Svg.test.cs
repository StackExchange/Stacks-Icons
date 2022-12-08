namespace nuget.test;

public class SvgTest
{
    [Fact]
    public void StaticCompiles()
    {
        // TODO
        Assert.True(true);
    }

    [Fact]
    public void FindsIcon()
    {
        var icon = Svg.Accessibility;
        var spot = Svg.Spot.Ads;
        Assert.False(string.IsNullOrWhiteSpace(icon.Value));
        Assert.False(string.IsNullOrWhiteSpace(spot.Value));
    }
}