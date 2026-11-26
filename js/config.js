/**
 * TezGrowth Site Configuration
 * Update these values before deploying to production.
 */
window.TEZGROWTH_CONFIG = {
  brandName: 'TezGrowth',
  domain: 'https://tezgrowth.com',
  email: 'hello@tezgrowth.com',

  // Enter your WhatsApp number with country code, digits only (e.g., '918630027341')
  whatsappNumber: '918630027341',
  defaultWhatsappMessage: 'Hi TezGrowth, I would like to discuss digital marketing and growth services for my business.',

  // Analytics & Tracking Placeholders (replace with real IDs when ready)
  googleAnalyticsId: 'G-XXXXXXXXXX',
  metaPixelId: 'YOUR_META_PIXEL_ID',

  // Optional Supabase Integration (for saving contact form leads directly to Supabase)
  // Leave empty during static demo; fill in when connecting Supabase.
  supabase: {
    url: 'https://sxksdrxmqmfsoiwwngtx.supabase.co',
    anonKey: 'sb_publishable_aPPV4qX8fm_vnk2beZpPgQ_Oh67p8v7',
    table: 'enquiries'
  }
};
