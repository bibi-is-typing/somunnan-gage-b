import { withBase } from '../utils/urls';
import { canMeasure, eventNames, safeParameters } from './analytics-policy.mjs';
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
const id = import.meta.env.PUBLIC_GA4_ID || '';
const review = new URLSearchParams(location.search).get('review') === '1';
const enabled = canMeasure(id, location.hostname, review);
const routes = [
  '/',
  '/diagnosis/',
  '/diagnosis/complete/',
  '/examples/cafe-story/',
  '/examples/professional-notes/',
  '/privacy/',
].map(withBase);
const path = routes.includes(location.pathname) ? location.pathname : withBase('/404');
const pageLocation = location.origin + path;
let referrer = '';
try {
  referrer = document.referrer ? new URL(document.referrer).origin + '/' : '';
} catch {
  /* No referrer is needed. */
}
const once = new Set<string>();

if (enabled) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: pageLocation,
    page_referrer: referrer,
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.append(script);
}

export function track(name: string, parameters: Record<string, string> = {}, onlyOnce = false) {
  if (!eventNames.includes(name) || (onlyOnce && once.has(name))) return;
  if (onlyOnce) once.add(name);
  const payload = safeParameters(parameters);
  // Review mode displays the event name and allowlisted values only. No input text.
  if (review)
    document.dispatchEvent(
      new CustomEvent('somunnan:analytics-preview', { detail: { name, parameters: payload } }),
    );
  if (!enabled || !window.gtag) return;
  window.gtag('event', name, {
    ...payload,
    page_location: pageLocation,
    page_referrer: referrer,
    page_title: document.title,
  });
}

// Reserved for a future backend: call only after a real, confirmed save succeeds.
// Never called by the current demo form or completion page.
export function recordConfirmedLead(
  receipt: { id: string; saved: boolean },
  context: Record<string, string> = {},
) {
  if (!receipt.saved || !receipt.id) return;
  track('generate_lead', { ...context, form_type: 'consultation', mode: 'live' }, true);
}

track('page_view', {}, true);
document
  .querySelectorAll<HTMLAnchorElement>(`a[href^="${withBase('/diagnosis/')}"]`)
  .forEach((link) => {
    link.addEventListener('click', () => {
      const section =
        link.closest<HTMLElement>('[data-analytics-section]')?.dataset.analyticsSection ||
        (link.closest('header')
          ? 'header'
          : link.closest('.hero')
            ? 'hero'
            : link.closest('.final-cta')
              ? 'final'
              : link.closest('section')?.id || 'sample');
      track('consultation_clicked', { section, form_type: 'consultation' });
    });
  });
