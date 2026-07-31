import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase — projet Atlas Studio (Applications Mobiles).
 * La clé publiable est conçue pour être exposée côté client : le cloisonnement
 * des données est assuré par la RLS au niveau du moteur, pas par le secret de la clé.
 */
const URL = 'https://easoqoswtmvtkdwwkqtc.supabase.co';
const CLE_PUBLIABLE = 'sb_publishable_uU7x6fV-hcWbuaSJFU_a7Q_yedbUvLM';

export const supabase = createClient(URL, CLE_PUBLIABLE);
