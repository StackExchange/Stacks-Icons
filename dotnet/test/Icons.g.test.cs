using System.Reflection;

namespace StackExchange.StacksIcons.Test
{
    public class IconsTest
    {
        [Fact]
        public void AllIconsExist()
        {
            // check every icon to make sure it exists
            foreach (var icon in Svg.Lookup)
            {
                Assert.False(string.IsNullOrEmpty(icon.Value.ToString()), $"Svg `{icon.Key}` does not exist.");
            }
        }

        [Fact]
        public void AllIconsAddedToLookup()
        {
            // get all the properties from the class via reflection
            var props = typeof(Svg).GetProperties(BindingFlags.Static | BindingFlags.Public)
                .Select(f => f.Name)
                .ToArray();

            // get all the enum values
            var enumCount = Enum.GetNames(typeof(StacksIcon)).Length;

            // fail early if the lengths are not the same
            Assert.Equal(enumCount, props.Length);
            Assert.Equal(enumCount, Svg.Lookup.Keys.Count());

            for (var i = 0; i < props.Length; i++)
            {
                var success = Enum.TryParse<StacksIcon>(props[i], out var actualEnum);

                // make sure all the properties have a corresponding enum value
                Assert.True(success, $"Unable to parse prop `{props[i]}` as {nameof(StacksIcon)} enum.");

                // make sure all the values are represented as Lookup keys
                Assert.True(Svg.Lookup.ContainsKey(actualEnum), $"Unable to find prop {props[i]} in Lookup.");
            }
        }
    }
}
