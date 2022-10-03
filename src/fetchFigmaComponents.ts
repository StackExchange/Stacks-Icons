import https from 'https'
import fs from 'fs/promises'

const key = 'NxAqQAi9i5XsrZSm1WYj6tsM'
const figmaApi = 'https://api.figma.com/v1'

async function getFigmaNodeList() {

}

(async () => {
  try {
    await fetchFigma();
  } catch (error) {
    console.log(error);
  }
})();
