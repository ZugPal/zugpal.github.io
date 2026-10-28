// Settings: the only part you normally edit.

/* ============================================================
   SETTINGS — the only part you normally edit.
   Leave supabaseUrl empty to run in demo mode.
   ============================================================ */
const CONFIG = {
  supabaseUrl: "https://vkyfnewnpsyuhbmvryws.supabase.co",       // e.g. "https://abcd1234.supabase.co"
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZreWZuZXducHN5dWhibXZyeXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NTczMjUsImV4cCI6MjEwODMzMzMyNX0.FyGj1LjJkpDz6xtjKH28EscjSCtL_99M6mindIVG8rU",   // the "anon public" key from Supabase > Project Settings > API
  contactEmail: "",   // shown for objections to moderation decisions; until set, the app links to the Impressum
  talkTrain: {
    de: "Dienstag 07:42 · RE 1 ab Düren · Wagen 5",
    en: "Tuesday 07:42 · RE 1 from Düren · coach 5",
    ar: "الثلاثاء 07:42 · RE 1 من دورن · العربة 5"
  }
};

export { CONFIG };
