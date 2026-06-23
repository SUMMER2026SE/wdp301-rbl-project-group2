const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const hookPath = path.resolve(__dirname, 'useProducts.ts');
const hookSource = fs.readFileSync(hookPath, 'utf8');

const toggleMatch = hookSource.match(
  /const toggleAvailability = useCallback\(async \(product: Product\) => \{[\s\S]*?\n  \}, \[\]\);/
);

assert.ok(toggleMatch, 'useProducts must expose toggleAvailability');

const toggleSource = toggleMatch[0];

assert.match(
  toggleSource,
  /productService\.updateProductAvailability\(/,
  'availability toggles must call the operational availability endpoint'
);

assert.doesNotMatch(
  toggleSource,
  /productService\.updateProduct\(/,
  'availability toggles must not call the full product update endpoint'
);

console.log('useProducts availability toggle uses operational endpoint');
