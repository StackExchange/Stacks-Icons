const path = require('path')
const fs = require('fs').promises

// Path to Stacks Icons, exprted from Figma
const srcIcons = path.join(__dirname, '/src/Icon')

// Path to destination for SVGs
const destIcons = path.join(__dirname, '/build/lib')

// Output the front-end helper
const jsFile = path.join(__dirname, '/index.js')

// Output the Razor helper
const csFile = path.join(__dirname, '/build/helper.cs')

// Output the YAML helper
const ymlFile = path.join(__dirname, '/build/icons.yml')

// Output the JSON helper
const jsonFile = path.join(__dirname, '/build/icons.json')

// File format
const ext = '.svg'

// SVGO settings
const SVGO = require('svgo')
const svgo = new SVGO({
  plugins: [
    {
      convertPathData: {
        floatPrecision: 2,
        transformPrecision: 4
      }
    },
    {
      cleanupNumericValues: {
        floatPrecision: 2
      }
    },
    {
      collapseGroups: true
    },
    {
      removeTitle: true,
    },
    {
      removeViewBox: false,
    },
    {
      removeUselessStrokeAndFill: true,
    },
    {
      removeAttrs: {
        attrs: ['xmlns', 'fill-rule', 'clip-rule']
      }
    },
    {
      mergePaths: {
        force: true
      }
    }
  ]
});

(async () => {
  // Read the source directory of SVGs
  let icons = await fs.readdir(srcIcons)

  // We only want .svg, ignore the rest
  icons = icons.filter(i => path.extname(i).toLowerCase() === ext)

  // Remove .svg from name
  icons = icons.map(i => path.basename(i, ext))

  // Sort alphabetically
  icons = icons.sort()

  // Array of promises which do the fetching of the files
  let processed = icons.map(i => fs.readFile(path.resolve(srcIcons, i + ext), 'utf8'))
  processed = await Promise.all(processed)

  // Optimise them with SVGO
  processed = processed.map(i => svgo.optimize(i))
  processed = await Promise.all(processed)

  // Get the data from the SVG object
  processed = processed.map(i => i.data)

  // Do our custom tweaks to the output
  processed = processed.map((i, idx) =>
    i
      .replace('<svg', `<svg aria-hidden="true" class="svg-icon icon${icons[idx]}"`)
      .replace(/<\/?g(\s.+?)*>/g, '')
      .replace(/fill="#000"/gmi, '')
      .replace(/fill="none"/gmi, '')
      .replace(/fill="#222426"/gmi, 'fill="var(--black-800)"')
      .replace(/fill="#fff"/gmi, 'fill="var(--white)"')
      .replace(/fill="#6A7E7C"/gmi, 'fill="var(--black-500)"')
      .replace(/fill="#1A1104"/gmi, 'fill="var(--black-900)"')
      .replace(/\s>/gm, '>')
      .replace(/\s\/>/gm, '/>')
  )

  // Make an object of our icons { IconName: '<svg>' }
  let iconsObj = {}
  processed.forEach((icon, idx) => {
    iconsObj[icons[idx]] = icon

    // Save each svg
    fs.writeFile(path.resolve(destIcons, icons[idx] + ext), icon, 'utf8')
  })

  // The string to print in our helper.js
  let jsDefinition = 'var stacksIcons = ' + JSON.stringify(iconsObj)

  // Read the existing helper.js
  let jsOutput = await fs.readFile(jsFile, 'utf8')

  // Replace the object in the js file
  // Replaces everything inbetween "// Start icons" and "// End icons"
  jsOutput = jsOutput.replace(/\/\/ Start icons(.|[\r\n])*\/\/ End icons/gm, "// Start icons\n" + jsDefinition + "\n// End icons")

  // Razor - helpers.cs
  const csOutput = icons.map(i => `public static SvgImage ${i} { get; } = GetImage();`).join("\n")

  // icons.yml
  const ymlOutput = icons.map(i => `- helper: ${i}`).join("\n")

  // icons.json
  const jsonOutput = JSON.stringify(icons.map(i => ({ helper: i })), null, 2)

  // Write it all to the files
  try {
    fs.writeFile(jsFile, jsOutput, 'utf8')
    fs.writeFile(csFile, csOutput, 'utf8')
    fs.writeFile(ymlFile, ymlOutput, 'utf8')
    fs.writeFile(jsonFile, jsonOutput, 'utf8')
  }
  catch (err) {
    throw err
  }

  // All good
  console.log('Successfuly built ' + icons.length + ' icons!')
})()