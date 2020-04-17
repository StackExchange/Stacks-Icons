import * as Icons from '../../build/icons.json'
export default Icons
import { browserHelper } from './helpers'
export { browserHelper }

// auto execute the helper if running in a browser context
if (typeof window !== 'undefined') {
  browserHelper(Icons)
}
