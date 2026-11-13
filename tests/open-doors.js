// Feature tests buy Large companies and sign top specialists with brand-new players: lift the prestige gates
// (PRESTIGE in content.js). tests/prestige.test.js tests the gates themselves.
import { PRESTIGE } from '../supabase/functions/_shared/content.js';
PRESTIGE.bigTier = 0; PRESTIGE.talent = {};
