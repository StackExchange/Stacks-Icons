const path = require('path')
const fs = require('fs').promises
const del = require('del')
const webpack = require('webpack')

// SVGO settings
const SVGO = require('svgo')
const svgoConfig = require('./svgo.json')
const svgo = new SVGO(svgoConfig)

async function cleanBuildDirectoryAsync () {
  // Clear the existing SVGs in build/lib
  await del(path.join(__dirname, '/build/**'))
}

async function processSvgFilesAsync(srcPath, destPath, type) {
  // File format
  const ext = '.svg'

  // Read the source directory of SVGs
  let icons = await fs.readdir(srcPath)

  // We only want .svg, ignore the rest
  icons = icons.filter(i => path.extname(i).toLowerCase() === ext)

  // Remove .svg from name
  icons = icons.map(i => path.basename(i, ext))

  // Sort alphabetically
  icons = icons.sort()

  // Array of promises which do the fetching of the files
  let processed = icons.map(i =>
    fs.readFile(path.resolve(srcPath, i + ext), 'utf8')
  )
  processed = await Promise.all(processed)

  // Optimise them with SVGO
  processed = processed.map(i => svgo.optimize(i))
  processed = await Promise.all(processed)

  // Get the data from the SVGO object
  processed = processed.map(i => i.data)

  var typeClass = type.toLowerCase();

  // Do our custom tweaks to the output
  processed = processed.map(
    (i, idx) =>
      i
        .replace(
          '<svg',
          `<svg aria-hidden="true" class="svg-${typeClass} ${typeClass}${icons[idx]}"`
        ) // Add classes and aria-attributes since our source files don't have them
        .replace(/fill="#000"/gi, '') // Remove any fills so paths are colored by the parents' color
        .replace(/fill="none"/gi, '') // Remove any empty fills that SVGO's removeUselessStrokeAndFill: true doesn't remove
        .replace(/fill="#222426"/gi, 'fill="var(--black-800)"') // Replace hardcoded hex value with appropriate CSS variables
        .replace(/fill="#fff"/gi, 'fill="var(--white)"')
        .replace(/fill="#6A7E7C"/gi, 'fill="var(--black-500)"')
        .replace(/fill="#1A1104"/gi, 'fill="var(--black-900)"')
        .replace(/paint(.*?)_linear/gi, `${icons[idx]}$1_linear`) // Replace any gradient ID with the icon name to namespace
        .replace(/\s>/g, '>') // Remove extra space before closing bracket on opening svg element
        .replace(/\s\/>/g, '/>') // Remove extra space before closing bracket on path tag element
  )

  // ensure the directory is created
  await fs.mkdir(path.join(__dirname, '/build/lib/' + type), { recursive: true })

  // Make an object of our icons { IconName: '<svg>' }
  let iconsObj = {}
  processed.forEach((icon, idx) => {
    iconsObj[icons[idx]] = icon

    // Save each svg
    fs.writeFile(path.resolve(destPath, icons[idx] + ext), icon, 'utf8')
  })

  return { icons, iconsObj }
}

function writeRazor(icons, type) {
  // Output the Razor helper
  const csFile = path.join(__dirname, '/build/Helper' + type + 's.cs')
  let imagePath = ""

  if (type === 'Spot') {
    imagePath = 'folder: "../stacks-spots"'
  }

  const csOutput = icons
    .map(i => `public static SvgImage ${i} { get; } = GetImage(${imagePath});`)
    .join('\n')
  fs.writeFile(csFile, csOutput, 'utf8')
}

function writeEnums(icons, type) {
  // Output enums file
  const enumsFile = path.join(__dirname, '/build/' + type + 's.cs')
  let enumsOutput = 'public enum Icons\n{\n'
  enumsOutput += icons.map(i => `    ${i},`).join('\n')
  enumsOutput += '\n}'
  fs.writeFile(enumsFile, enumsOutput, 'utf8')
}

function writeEleventyJson(icons, type) {
  // Output the Json helper
  const eleventyJsonFile = path.join(__dirname, '/build/' + type.toLowerCase() + 'sEleventy.json')
  let eleventyJsonOutput = '[\n'
  eleventyJsonOutput += icons.map(i => `  {\n    "helper": "${i}"`).join('\n  },\n')
  eleventyJsonOutput += '\n  }\n]'
  fs.writeFile(eleventyJsonFile, eleventyJsonOutput, 'utf8')
}

function writeJson(iconsObj, type) {
  // Output the JSON helper
  const jsonFile = path.join(__dirname, '/build/' + type.toLowerCase() + 's.json')
  const jsonOutput = JSON.stringify(iconsObj, null, 2)
  fs.writeFile(jsonFile, jsonOutput, 'utf8')
}

function writeHTML(iconsObj, type) {
  // Output the HTML manifest
  const htmlFile = path.join(__dirname, '/build/' + type.toLowerCase() + 's.html')
  let htmlOutput = `<!DOCTYPE html>\n<html>\n<head>\n<title>${type}s Test Preview</title>\n</head>\n<body style="padding: 32px; display:grid; gap:32px; text-align: center; color: #666; font-family: arial, sans-serif; font-size: 12px; grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));">\n`

  for (let [key, value] of Object.entries(iconsObj)) {
    htmlOutput += `  <div>${key}<br><br>${value}</div>\n`
  }

  htmlOutput += '</body>\n</html>'
  fs.writeFile(htmlFile, htmlOutput, 'utf8')
}

async function buildSvgSetAsync(buildPrefix) {
  // Import/export paths
  const srcIconsPath = path.join(__dirname, '/src/' + buildPrefix)
  const destIconsPath = path.join(__dirname, '/build/lib/' + buildPrefix)
  let { icons, iconsObj } = await processSvgFilesAsync(srcIconsPath, destIconsPath, buildPrefix);

  writeRazor(icons, buildPrefix);
  writeEnums(icons, buildPrefix);
  writeEleventyJson(icons, buildPrefix);
  writeJson(iconsObj, buildPrefix);
  writeHTML(iconsObj, buildPrefix);

  return icons.length
}

function bundleHelperJsAsync() {
  return new Promise((resolve, reject) => {
    // bundle together our JS after building the required JSON file
    webpack({
      entry: './src/js/index.js',
      mode: 'production',
      output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'build'),
        library: 'StacksIcons',
        libraryTarget: 'umd',
        globalObject: 'this'
      }
    }).run((err, stats) => {
      if (err) {
        let errors = err.stack || err;
        console.error(errors)
        reject(errors)
      }
      else if (stats.hasErrors()) {
        let errors = stats.toJson().errors;
        console.error(errors)
        reject(errors)
      }
      else {
        resolve()
      }
    })
  });
}

;(async () => {
  await cleanBuildDirectoryAsync();

  let iconCount = await buildSvgSetAsync('Icon');
  let spotCount = await buildSvgSetAsync('Spot');
  await bundleHelperJsAsync();

  // All good
  console.log(`Successfully built ${iconCount} icons and ${spotCount} spots`)
})()