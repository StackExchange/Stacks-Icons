import * as Icons from "../../build/icons.js";
import * as Spots from "../../build/spots.js";
export { browserHelper } from "./helpers";
export { Icons, Spots };

// automatically run if in the browser and not being imported
if (global && global.document && typeof exports !== "object") {
  browserHelper(Icons, Spots);
}
