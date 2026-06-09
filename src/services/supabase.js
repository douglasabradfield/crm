import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// supabaseAnon (anon key) é pública por design — só funciona com as RLS policies do banco.
// Nunca coloque a service_role key aqui.
export const supabase = createClient(supabaseUrl, supabaseAnon);
