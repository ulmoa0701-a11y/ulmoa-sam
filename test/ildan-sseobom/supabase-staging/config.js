// PUBLIC project identifier + publishable (browser-safe) key. NO service-role or encryption secret.
// STAGING ONLY: all clinical writes disabled at Supabase Edge Function.
window.ILDAN_SUPABASE_CONFIG=Object.freeze({
  phoneOtpEnabled: false, // SMS provider + user approval required. Never send SMS while false.
  url:"https://miohovwmhmtcvkurjamm.supabase.co",
  publishableKey:"sb_publishable_HFaaKmZ84O6Mreo3Zo8N3g_uw2MtrYe",
  apiUrl:"https://miohovwmhmtcvkurjamm.supabase.co/functions/v1/ildan-api"
});
