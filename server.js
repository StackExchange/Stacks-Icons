const path = require('path')
const fs = require('fs').promises
const webpack = require('webpack')

// Import/export paths
const destPath = path.join(__dirname, '/build')

const srcIconsPath = path.join(__dirname, '/src/Icon')
const destIconsPath = path.join(__dirname, '/build/lib/icon')

const srcSpotsPath = path.join(__dirname, '/src/Spot')
const destSpotsPath = path.join(__dirname, '/build/lib/spot')

// File format
const ext = '.svg'

// SVGO settings
const SVGO = require('svgo')
const svgoConfig = require('./svgo.json')
const svgo = new SVGO(svgoConfig)

;(async () => {
  // Clear the existing SVGs in build/lib
  clearDirectory(destIconsPath)
  clearDirectory(destSpotsPath)

  // Process the SVGs by optimizing and adding attributes
  processSVG(srcIconsPath, destIconsPath, "icon")
  processSVG(srcSpotsPath, destSpotsPath, "spot")

  // // bundle together our JS after building the required JSON file
  // webpack({
  //   entry: './src/js/index.js',
  //   mode: 'production',
  //   output: {
  //     filename: 'index.js',
  //     path: path.resolve(__dirname, 'build'),
  //     library: 'StacksIcons',
  //     libraryTarget: 'umd',
  //     globalObject: 'this'
  //   }
  // }).run((err, stats) => {
  //   if (err) {
  //     console.error(err.stack || err)
  //   }
  //   if (stats.hasErrors()) {
  //     console.error(stats.toJson().errors)
  //   }
  // })

  // // All good
  // console.log('Successfully built ' + icons.length + ' icons!')
})()

async function clearDirectory(destinationPath) {
  let existing = await fs.readdir(destinationPath)
  existing.map(file => fs.unlink(path.resolve(destinationPath, file)))
  await Promise.all(existing)
}

async function processSVG(sourcePath, destinationPath, prefix) {
  // Read the source directory of SVGs
  let svgs = await fs.readdir(sourcePath)

  // We only want .svg, ignore the rest
  svgs = svgs.filter(i => path.extname(i).toLowerCase() === ext)

  // Remove .svg from name
  svgs = svgs.map(i => path.basename(i, ext))

  // Sort alphabetically
  svgs = svgs.sort()

  // Array of promises which do the fetching of the files
  let processed = svgs.map(i =>
    fs.readFile(path.resolve(sourcePath, i + ext), 'utf8')
  )
  processed = await Promise.all(processed)

  // Optimise them with SVGO
  processed = processed.map(i => svgo.optimize(i))
  processed = await Promise.all(processed)

  // Get the data from the SVGO object
  processed = processed.map(i => i.data)

  // Do our custom tweaks to the output
  processed = processed.map(
    (i, idx) =>
      i
        .replace(
          '<svg',
          `<svg aria-hidden="true" class="svg-${prefix} ${prefix}${svgs[idx]}"`
        ) // Add classes and aria-attributes since our source files don't have them
        .replace(/fill="#000"/gi, '') // Remove any fills so paths are colored by the parents' color
        .replace(/fill="none"/gi, '') // Remove any empty fills that SVGO's removeUselessStrokeAndFill: true doesn't remove
        .replace(/fill="#222426"/gi, 'fill="var(--black-800)"') // Replace hardcoded hex value with appropriate CSS variables
        .replace(/fill="#fff"/gi, 'fill="var(--white)"')
        .replace(/fill="#6A7E7C"/gi, 'fill="var(--black-500)"')
        .replace(/fill="#1A1104"/gi, 'fill="var(--black-900)"')
        .replace(/\s>/g, '>') // Remove extra space before closing bracket on opening svg element
        .replace(/\s\/>/g, '/>') // Remove extra space before closing bracket on path tag element
  )

  // Make an object of our SVGs { SvgName: '<svg>' }
  let svgsObj = {}
  processed.forEach((svg, idx) => {
    svgsObj[svgs[idx]] = svg

    // Save each svg
    fs.writeFile(path.resolve(destinationPath, svgs[idx] + ext), svg, 'utf8')
  })

  // Output Razor
  buildRazor(svgs, destPath, prefix, "Helper.cs")

  // Output Enums
  buildEnums(svgs, destPath, prefix, "Enums.cs")

  // Output Json
  buildJson(svgsObj, destPath, prefix, ".json")
}

async function buildRazor(svgs, destinationPath, prefix, filename) {
  // Output the Razor helper
  const pluralizeFilename = prefix + "s" + filename
  const csFile = path.join(destinationPath, pluralizeFilename)
  const csOutput = svgs
    .map(i => `public static SvgImage ${i} { get; } = GetImage();`)
    .join('\n')
  fs.writeFile(csFile, csOutput, 'utf8')
}

async function buildEnums(svgs, destinationPath, prefix, filename) {
  const pluralizeFilename = prefix + "s" + filename
  const enumsName = prefix.charAt(0).toUpperCase() + prefix.slice(1)
  const enumsFile = path.join(destinationPath, pluralizeFilename)
  let enumsOutput = `public enum ${enumsName}\n{\n`
  enumsOutput += svgs.map(i => `    ${i},`).join('\n')
  enumsOutput += '\n}'
  fs.writeFile(enumsFile, enumsOutput, 'utf8')
}

async function buildJson(object, destinationPath, prefix, filename) {
  const pluralizeFilename = prefix + "s" + filename
  const jsonFile = path.join(destinationPath, pluralizeFilename)
  const jsonOutput = JSON.stringify(object, null, 2)
  fs.writeFile(jsonFile, jsonOutput, 'utf8')
}