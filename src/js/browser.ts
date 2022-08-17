// @ts-expect-error
import * as Icons from "../../build/icons.js";
// @ts-expect-error
import * as Spots from "../../build/spots.js";
import { browserHelper } from "./helpers";

export { Icons, Spots, browserHelper };

// automatically run if in the browser and not being imported
if (window && window.document && window.document.currentScript) {
  browserHelper(Icons, Spots);
}
