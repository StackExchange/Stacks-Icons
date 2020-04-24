import Icons from '../../build/icons.json'
export default Icons
import { browserHelper } from './helpers'
export { browserHelper }

// automatically run if in the browser and not being imported
if (global && global.document && typeof exports !== 'object') {
  browserHelper(Icons)
}