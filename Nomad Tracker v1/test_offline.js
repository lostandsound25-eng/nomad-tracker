const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://invalid-domain.supabase.co';
const SUPABASE_KEY = 'sb_publishable_urMkuF8kM4i-eaMc9VORuA_QyiVj6vX';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  try {
    const res = await sb.auth.getUser();
    console.log('Returned:', res);
  } catch (e) {
    console.log('Threw:', e.message);
  }
}
test();
