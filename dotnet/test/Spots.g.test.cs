using System.Reflection;

namespace StackExchange.StacksIcons.Test
{
    public class SpotsTest
    {
        [Fact]
        public void AllSpotsExist()
        {
            // check every icon to make sure it exists
            foreach (var icon in Svg.Lookup)
            {
                Assert.False(string.IsNullOrEmpty(icon.Value.ToString()), $"Svg `{icon.Key}` does not exist.");
            }
        }

        [Fact]
        public void AllSpotsAddedToLookup()
        {
            // get all the properties from the class via reflection
            var props = typeof(Svg.Spot).GetProperties(BindingFlags.Static | BindingFlags.Public)
                .Select(f => f.Name)
                .ToArray();

            // get all the enum values
            var enumCount = Enum.GetNames(typeof(StacksSpot)).Length;

            // fail early if the lengths are not the same
            Assert.Equal(enumCount, props.Length);
            Assert.Equal(enumCount, Svg.Spot.Lookup.Keys.Count());

            for (var i = 0; i < props.Length; i++)
            {
                var success = Enum.TryParse<StacksSpot>(props[i], out var actualEnum);

                // make sure all the properties have a corresponding enum value
                Assert.True(success, $"Unable to parse prop `{props[i]}` as {nameof(StacksSpot)} enum.");

                // make sure all the values are represented as Lookup keys
                Assert.True(Svg.Spot.Lookup.ContainsKey(actualEnum), $"Unable to find prop {props[i]} in Lookup.");
            }
        }
    }
}
