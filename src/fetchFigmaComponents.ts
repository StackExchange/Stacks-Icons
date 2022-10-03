import axios from 'axios';
import fs from 'fs';

// https://www.figma.com/developers/api
const fetch = axios.create({
  baseURL: 'https://api.figma.com/v1',
  headers: { 'X-Figma-Token': process.env['FIGMA_ACCESS_TOKEN']! },
});

// Derived from the file url of the Stacks icons i.e., https://www.figma.com/file/:key
const key = 'NxAqQAi9i5XsrZSm1WYj6tsM';

// https://www.figma.com/developers/api#get-files-endpoint
interface FigmaComponent {
  name: string,
  node_id: string,
  thumbnail_url: string,
  created_at: string,
  updated_at: string,
};

interface NameMap {
  [key: string]: string
};

export default async () => {
  // Get the Stacks icon file
  const stacksFile = await fetch.get(`/files/${key}/components`)

  // Full returned components list
  const components:FigmaComponent[] = stacksFile.data.meta.components

  // Create an array of their nodes
  // ['2:18', '7938:0', ...]
  const componentIds = components.map(c => c.node_id)

  // Get the component name by node_id
  // { "NODE_ID": "NAME", ... }
  let names:NameMap = {}
  components.forEach(c => names[c.node_id] = c.name)

  // Returns a object of urls
  // https://www.figma.com/developers/api#get-images-endpoint
  // { "images": { "NODE_ID": "AWS URL", ... } }
  const urls = await fetch.get(`/images/${key}`, {
    params: { format: "svg", ids: componentIds.join(",") },
  })

  let queue = []

  // Loop over the object of images
  for (let node_id in urls.data.images) {
    const name = names[node_id]
    const url = urls.data.images[node_id]
    const location = `./src/${name}.svg`

    console.log(`👀 Fetching: '${name}' (${url})`)
    
    queue.push(
      axios
        .get(url, { responseType: "stream" })
        .then(file => file.data.pipe( fs.createWriteStream(location) ))
    )
  }

  Promise.all(queue)
    .then(() => `✅ Fetched ${components.length} icons from Figma!`)
    .catch(err => {
      throw err
    })
}