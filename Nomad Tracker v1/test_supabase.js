const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://demldrpockwyrjalejbx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_urMkuF8kM4i-eaMc9VORuA_QyiVj6vX';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const res = await sb.auth.signInWithPassword({ email: 'test_xyz_123@example.com', password: 'password123' });
  console.log(res);
}
test();
