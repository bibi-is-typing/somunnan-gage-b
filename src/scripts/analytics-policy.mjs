export const eventNames = [
  'page_view',
  'industry_selected',
  'consultation_clicked',
  'diagnosis_started',
  'diagnosis_completed',
  'diagnosis_demo_completed',
  'generate_lead',
];
export function canMeasure(id, hostname, review) {
  return (
    /^G-[A-Z0-9]{6,20}$/.test(id || '') &&
    !review &&
    !['localhost', '127.0.0.1', '[::1]', '::1', ''].includes(hostname) &&
    !hostname.endsWith('.local')
  );
}
export function safeParameters(input = {}) {
  const output = {};
  const allowed = {
    industry: ['cafe', 'professional', 'local', 'other', 'unspecified'],
    help: ['consulting', 'management', 'unknown'],
    section: [
      'header',
      'hero',
      'industries',
      'work',
      'services',
      'process',
      'pricing',
      'faq',
      'footer',
      'final',
      'sample',
      'other',
    ],
    form_type: ['consultation'],
    mode: ['demo', 'live'],
  };
  for (const [key, values] of Object.entries(allowed)) {
    if (typeof input[key] === 'string' && values.includes(input[key])) output[key] = input[key];
  }
  return output;
}
