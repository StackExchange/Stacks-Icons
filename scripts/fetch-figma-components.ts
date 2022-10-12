import axios from "axios";
import fs from "fs/promises";
import { createHash } from "node:crypto";
import { Paths } from "./paths.js";
import { definitions, FIGMA_FILE_KEY } from "./definitions.js";

const path = new Paths();

// https://www.figma.com/developers/api#get-files-endpoint
export interface FigmaComponent {
  name: string;
  node_id: string;
  thumbnail_url: string;
  created_at: string;
  updated_at: string;
}

export const fetchFromFigma = async () => {
  // https://www.figma.com/developers/api
  const fetch = axios.create({
    baseURL: "https://api.figma.com/v1",
    headers: { "X-Figma-Token": process.env["FIGMA_ACCESS_TOKEN"]! },
  });

  // Get the Stacks icon file
  console.log(`Fetching all components from Figma (${FIGMA_FILE_KEY})...`);
  const stacksFile = await fetch.get(`/files/${FIGMA_FILE_KEY}/components`);

  // Full returned components list
  const components: FigmaComponent[] = stacksFile.data.meta.components;

  // {"2:18": "Icon/Foo", "7938:0": "Spot/Bar", ... }
  // mapping of node_id to component name
  let names: Record<string, string> = {};

  for (const component of components) {
    const name = component.name;
    const nodeId = component.node_id;

    // only fetch the images that are in the definitions file
    if (!(name in definitions)) {
      console.warn(`WARNING: ${name} found in Figma, but not in definitions`);
      continue;
    }

    names[nodeId] = component.name;
  }

  // double check that all definition entries were found in Figma
  const allRequestedDefs = Object.keys(definitions);
  const fetchedComponents = Object.values(names);
  for (const def of allRequestedDefs) {
    if (!fetchedComponents.includes(def)) {
      console.warn(`WARNING: ${def} found in definitions, but not in Figma`);
    }
  }

  // Returns a object of urls
  // https://www.figma.com/developers/api#get-images-endpoint
  // { "images": { "NODE_ID": "AWS URL", ... } }
  const urls = await fetch.get(`/images/${FIGMA_FILE_KEY}`, {
    params: { format: "svg", ids: Object.keys(names).join(",") },
  });

  let queue = [];
  const incorrectHashes: Record<string, string> = {};
  const images = Object.entries(urls.data.images as Record<string, string>);
  console.log(`Attempting to fetch ${images.length} files from Figma...`);

  // Loop over the object of images
  for (const entry of images) {
    const [node_id, url] = entry;
    const name = names[node_id!];

    if (!name || !url) {
      console.error(
        `Unable to find name or url: name: "${name}", url: "${url}"`
      );
      continue;
    }

    const location = path.src(`${name}.svg`);

    queue.push(
      axios
        .get(url)
        .then((resp) => {
          const data = resp.data;

          // calculate the hash
          const hash = createHash("sha256");
          hash.update(data);
          const sha256 = hash.digest("base64");

          //console.debug(`💾 '${name}' (${url}) ${sha256}`);

          if (definitions[name] === sha256) {
            // write to file
            return fs.writeFile(location, data);
          } else {
            incorrectHashes[name] = sha256;
            // don't crash the process on a failed hash, resolve and error later
            return Promise.resolve();
          }
        })
        .catch((err) => {
          console.error(err);
        })
    );
  }

  // wait for all the files to come back and be written to disk
  await Promise.all(queue);

  const hashEntries = Object.entries(incorrectHashes).sort((a, b) => {
    if (a < b) {
      return -1;
    }

    if (a > b) {
      return 1;
    }

    return 0;
  });

  if (hashEntries.length) {
    throw `Hash mismatch on ${hashEntries.length} files. Expected hash values:
    ${hashEntries.reduce((p, [k, v]) => p + `"${k}": "${v}",\n`, "")}`;
  }

  return components;
};
