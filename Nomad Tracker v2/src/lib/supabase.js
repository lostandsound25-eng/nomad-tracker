import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uzzlfusmyzthdtaaggvo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FiksI4ti8gwFPw77bOmpyg_E_EXGry6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
