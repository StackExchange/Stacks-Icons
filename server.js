const path = require('path')
const fs = require('fs').promises
const webpack = require('webpack');

// Import/export paths
const srcIconsPath = path.join(__dirname, '/src/Icon')
const destIconsPath = path.join(__dirname, '/build/lib')

// File format
const ext = '.svg'

// SVGO settings
const SVGO = require('svgo')
const svgoConfig = require('./svgo.json')
const svgo = new SVGO(svgoConfig);

(async () => {
  // Clear the existing SVGs in build/lib
  let existing = await fs.readdir(destIconsPath)
  existing.map(file => fs.unlink(path.resolve(destIconsPath, file)))
  await Promise.all(existing)

  // Read the source directory of SVGs
  let icons = await fs.readdir(srcIconsPath)

  // We only want .svg, ignore the rest
  icons = icons.filter(i => path.extname(i).toLowerCase() === ext)

  // Remove .svg from name
  icons = icons.map(i => path.basename(i, ext))

  // Sort alphabetically
  icons = icons.sort()

  // Array of promises which do the fetching of the files
  let processed = icons.map(i => fs.readFile(path.resolve(srcIconsPath, i + ext), 'utf8'))
  processed = await Promise.all(processed)

  // Optimise them with SVGO
  processed = processed.map(i => svgo.optimize(i))
  processed = await Promise.all(processed)

  // Get the data from the SVGO object
  processed = processed.map(i => i.data)

  // Do our custom tweaks to the output
  processed = processed.map((i, idx) =>
    i
      .replace('<svg', `<svg aria-hidden="true" class="svg-icon icon${icons[idx]}"`) // Add classes and aria-attributes since our source files don't have them
      .replace(/fill="#000"/gi, '') // Remove any fills so paths are colored by the parents' color
      .replace(/fill="none"/gi, '') // Remove any empty fills that SVGO's removeUselessStrokeAndFill: true doesn't remove
      .replace(/fill="#222426"/gi, 'fill="var(--black-800)"') // Replace hardcoded hex value with appropriate CSS variables
      .replace(/fill="#fff"/gi, 'fill="var(--white)"')
      .replace(/fill="#6A7E7C"/gi, 'fill="var(--black-500)"')
      .replace(/fill="#1A1104"/gi, 'fill="var(--black-900)"')
      .replace(/\s>/g, '>') // Remove extra space before closing bracket on opening svg element
      .replace(/\s\/>/g, '/>') // Remove extra space before closing bracket on path tag element
  )

  // Make an object of our icons { IconName: '<svg>' }
  let iconsObj = {}
  processed.forEach((icon, idx) => {
    iconsObj[icons[idx]] = icon

    // Save each svg
    fs.writeFile(path.resolve(destIconsPath, icons[idx] + ext), icon, 'utf8')
  })

  // Output the Razor helper
  const csFile = path.join(__dirname, '/build/helper.cs')
  const csOutput = icons.map(i => `public static SvgImage ${i} { get; } = GetImage();`).join('\n')
  fs.writeFile(csFile, csOutput, 'utf8')

  // Output enums file
  const enumsFile = path.join(__dirname, '/build/Icons.cs')
  let enumsOutput = 'public enum Icons\n{\n'
  enumsOutput += icons.map(i => `    ${i},`).join('\n')
  enumsOutput += '\n}'
  fs.writeFile(enumsFile, enumsOutput, 'utf8')

  // Output the YAML helper
  const ymlFile = path.join(__dirname, '/build/icons.yml')
  const ymlOutput = icons.map(i => `- helper: ${i}`).join('\n')
  fs.writeFile(ymlFile, ymlOutput, 'utf8')

  // Output the JSON helper
  const jsonFile = path.join(__dirname, '/build/icons.json')
  const jsonOutput = JSON.stringify(iconsObj, null, 2)
  fs.writeFile(jsonFile, jsonOutput, 'utf8')

  // bundle together our JS after building the required JSON file
  webpack({
    entry: './src/js/index.js',
    mode: 'production',
    output: {
      filename: 'index.js',
      path: path.resolve(__dirname, 'build'),
      library: 'StacksIcons',
      libraryTarget: 'umd'
    }
  }).run((err, stats) => {
    if (err) {
      console.error(err.stack || err)
    }
    if (stats.hasErrors()) {
      console.error(stats.toJson().errors)
    }
  });

  // All good
  console.log('Successfully built ' + icons.length + ' icons!')
})()