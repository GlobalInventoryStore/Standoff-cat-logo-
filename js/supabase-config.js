
        (function initSupabaseSeguro() {
            const cfg = window.CONFIG || {};
            const supabaseUrl = cfg.SUPABASE_URL || document.querySelector('meta[name="supabase-url"]')?.content || null;
            const supabaseKey = cfg.SUPABASE_PUBLISHABLE_KEY || document.querySelector('meta[name="supabase-key"]')?.content || null;
            window.supabaseClient = null;
            try {
                if (supabaseUrl && supabaseKey && window.supabase && typeof window.supabase.createClient === "function") {
                    window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
                }
            } catch (e) {}
        })();
