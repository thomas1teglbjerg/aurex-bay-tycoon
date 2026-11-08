// Feature tests that use Medium/Large companies or warehouses as running businesses import this first:
// it switches off the "M/L companies and warehouses start as building plots" rule for that test run.
// The plot rules themselves are tested in tests/build.test.js.
import { BUILD } from '../supabase/functions/_shared/content.js';
BUILD.sizes = []; BUILD.warehouses = false;
