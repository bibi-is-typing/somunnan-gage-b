import { withBase } from '../utils/urls';
import { recordConfirmedLead, track } from './analytics';
import { submitIntake } from './intake';
import './review';
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const revealItems = document.querySelectorAll<HTMLElement>('[data-reveal]');
// Content stays visible if JavaScript fails or reduced motion is requested.
if (!motion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 },
  );
  revealItems.forEach((item) => {
    item.classList.add('reveal-ready');
    observer.observe(item);
  });
  motion.addEventListener('change', (event) => {
    if (event.matches) {
      observer.disconnect();
      revealItems.forEach((item) => item.classList.remove('reveal-ready'));
    }
  });
}

document.querySelectorAll<HTMLElement>('[data-tabs]').forEach((group) => {
  const tabs = [...group.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = [...group.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
  const selectTab = (tab: HTMLButtonElement, focus = false) => {
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      panel.hidden = panel.id !== tab.getAttribute('aria-controls');
    });
    if (focus) tab.focus();
    if (tab.id.startsWith('tab-'))
      track('industry_selected', { industry: tab.id.replace('tab-', '') });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (event) => {
      let next: number | undefined;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        selectTab(tabs[next], true);
      }
    });
  });
});

const menuButton = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const mobileMenu = document.querySelector<HTMLElement>('#mobile-menu');
if (menuButton && mobileMenu) {
  const setMenu = (open: boolean) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    mobileMenu.hidden = !open;
  };
  menuButton.addEventListener('click', () => setMenu(!!mobileMenu.hidden));
  mobileMenu
    .querySelectorAll('a')
    .forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !mobileMenu.hidden) {
      setMenu(false);
      menuButton.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (
      event.target instanceof Node &&
      !mobileMenu.contains(event.target) &&
      !menuButton.contains(event.target)
    )
      setMenu(false);
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
  });
}

const completionKey = 'somunnan-demo-completed';
const form = document.querySelector<HTMLFormElement>('#diagnosis-form');
if (form) {
  const params = new URLSearchParams(window.location.search);
  const industry = form.querySelector<HTMLSelectElement>('#industry')!;
  const industryValue = params.get('industry');
  if (industryValue && [...industry.options].some((option) => option.value === industryValue))
    industry.value = industryValue;
  const helpValue = params.get('help');
  form.querySelectorAll<HTMLInputElement>('input[name="help"]').forEach((input) => {
    if (input.value === helpValue) input.checked = true;
  });
  const summary = form.querySelector<HTMLElement>('#form-error-summary')!;
  const optionalFields = form.querySelector<HTMLDetailsElement>('.optional-fields')!;
  const button = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  const status = form.querySelector<HTMLElement>('#submit-status')!;
  const live = form.dataset.live === 'true';
  const context = () => ({
    industry: industry.value || 'unspecified',
    help: form.querySelector<HTMLInputElement>('input[name=help]:checked')?.value || 'unknown',
    form_type: 'consultation',
    mode: live ? 'live' : 'demo',
  });
  form.addEventListener('input', () => track('diagnosis_started', context(), true), { once: true });
  const label = form.querySelector<HTMLElement>('[data-submit-label]')!;
  button.disabled = false;
  type Field = HTMLInputElement | HTMLSelectElement;
  const fields = ['business', 'industry', 'contact', 'channel', 'privacy-consent'];
  const validate = (id: string) => {
    const field = form.querySelector<Field>(`#${id}`)!;
    const error = form.querySelector<HTMLElement>(`#${id}-error`)!;
    let message = '';
    if (id === 'business' && !field.value.trim())
      message = '상호명 또는 ‘개업 준비 중’을 입력해주세요.';
    if (id === 'industry' && !field.value) message = '업종을 선택해주세요.';
    if (id === 'contact' && !/^0\d{8,10}$/.test(field.value.replace(/[\s-]/g, '')))
      message = '전화번호 형식으로 입력해주세요. 예: 010-0000-0000';
    if (id === 'channel' && field.value.trim()) {
      try {
        const url = new URL(field.value);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch {
        message = 'https://로 시작하는 전체 주소를 입력해주세요.';
        optionalFields.open = true;
      }
    }
    if (id === 'privacy-consent' && !(field as HTMLInputElement).checked)
      message = '상담 신청을 위해 개인정보 수집·이용에 동의해주세요.';
    field.setAttribute('aria-invalid', String(!!message));
    error.textContent = message;
    error.hidden = !message;
    return !message;
  };
  fields.forEach((id) => {
    const field = form.querySelector<Field>(`#${id}`)!;
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(id);
    });
    field.addEventListener('change', () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(id);
    });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (button.disabled) return;
    const invalid = fields.filter((id) => !validate(id));
    summary.hidden = invalid.length === 0;
    if (invalid.length) {
      summary.textContent = `${invalid.length}개 항목을 확인해주세요. 입력한 내용은 그대로 유지됩니다.`;
      form.querySelector<Field>(`#${invalid[0]}`)?.focus();
      return;
    }
    track('diagnosis_completed', context(), true);
    const goComplete = (kind: 'demo' | 'live') => {
      try {
        sessionStorage.setItem(completionKey, `${kind}:${Date.now()}`);
      } catch {
        /* 완료 화면은 일반 안내로 보입니다. */
      }
      form.reset();
      window.location.assign(
        new URLSearchParams(location.search).get('review') === '1'
          ? withBase('/diagnosis/complete/?review=1')
          : withBase('/diagnosis/complete/'),
      );
    };

    if (live) {
      // 실제 접수: 시트에 저장됐다는 응답을 받은 뒤에만 완료로 처리합니다.
      button.disabled = true;
      label.textContent = '신청 보내는 중…';
      status.classList.remove('submit-error');
      status.textContent = '잠시만 기다려주세요.';
      const value = (name: string) =>
        (form.elements.namedItem(name) as HTMLInputElement | null)?.value?.trim() ?? '';
      submitIntake({
        business: value('business'),
        industry: industry.value,
        industryLabel: industry.selectedOptions[0]?.textContent?.trim() ?? '',
        contact: value('contact'),
        help: form.querySelector<HTMLInputElement>('input[name=help]:checked')?.value || 'unknown',
        region: value('region'),
        channel: value('channel'),
        concern: (form.elements.namedItem('concern') as HTMLTextAreaElement | null)?.value.trim() ?? '',
        privacyConsent: 'Y',
        marketingConsent: (form.elements.namedItem('marketing-consent') as HTMLInputElement | null)
          ?.checked
          ? 'Y'
          : 'N',
        consentVersion: form.dataset.consentVersion || '',
        website: value('website'),
      })
        .then((receipt) => {
          recordConfirmedLead({ id: receipt.id, saved: true }, context());
          goComplete('live');
        })
        .catch(() => {
          button.disabled = false;
          label.textContent = '다시 보내기';
          status.classList.add('submit-error');
          const email = document.querySelector<HTMLAnchorElement>('.intake-callout a')?.textContent || '';
          status.textContent = `전송이 잘 안 됐어요. 입력하신 내용은 그대로 있으니 다시 보내주시거나, ${email}로 메일 주세요.`;
        });
      return;
    }

    // 미리보기: 입력값을 어디에도 보내거나 저장하지 않습니다.
    button.disabled = true;
    label.textContent = '데모 화면으로 이동 중';
    status.textContent = '입력 내용을 전송하지 않고 완료 화면을 열고 있습니다.';
    window.setTimeout(
      () => {
        track('diagnosis_demo_completed', context(), true);
        goComplete('demo');
      },
      motion.matches ? 0 : 450,
    );
  });
  window.addEventListener('pageshow', () => {
    button.disabled = false;
    label.textContent = live ? '상담 신청하기' : '작성 내용 확인하기';
    status.classList.remove('submit-error');
    status.textContent = live
      ? '신청 내용은 상담 연락에만 사용합니다.'
      : '미리보기라 정보는 저장·전송되지 않습니다.';
  });
}

const completeHeading = document.querySelector<HTMLElement>('[data-complete-heading]');
if (completeHeading) {
  let kind = '';
  try {
    const [k, t] = (sessionStorage.getItem(completionKey) || '').split(':');
    const timestamp = Number(t);
    if (timestamp > 0 && Date.now() >= timestamp && Date.now() - timestamp < 120000) kind = k;
    sessionStorage.removeItem(completionKey);
  } catch {
    /* 바로 들어오면 일반 안내가 보입니다. */
  }
  const copy = document.querySelector<HTMLElement>('[data-complete-copy]')!;
  const primary = document.querySelector<HTMLAnchorElement>('[data-complete-primary]')!;
  const home =
    new URLSearchParams(location.search).get('review') === '1' ? withBase('/?review=1') : withBase('/');
  if (kind === 'live') {
    completeHeading.textContent = '상담 신청이 접수됐어요.';
    copy.textContent = '영업일 기준 1일 안에 남겨주신 연락처로 연락드릴게요.';
    primary.textContent = '홈으로 돌아가기 →';
    primary.href = home;
  } else if (kind === 'demo') {
    completeHeading.textContent = '작성 내용을 확인했어요.';
    copy.textContent =
      '입력부터 완료까지 체험해주셔서 감사합니다. 입력한 내용은 저장하거나 전송하지 않았습니다.';
    primary.textContent = '홈으로 돌아가기 →';
    primary.href = home;
  }
}

// Each sample is a finished three-post set, navigable without drag gestures.
document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((gallery) => {
  const slides = [...gallery.querySelectorAll<HTMLElement>('[data-gallery-slide]')];
  const selectors = [...gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-index]')];
  let current = 0;
  const select = (index: number) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.hidden = i !== current;
    });
    selectors.forEach((button, i) => button.setAttribute('aria-pressed', String(i === current)));
    gallery.querySelector<HTMLElement>('[data-gallery-count]')!.textContent =
      `${current + 1} / ${slides.length}`;
  };
  gallery
    .querySelector('[data-gallery-prev]')
    ?.addEventListener('click', () => select(current - 1));
  gallery
    .querySelector('[data-gallery-next]')
    ?.addEventListener('click', () => select(current + 1));
  selectors.forEach((button, i) => button.addEventListener('click', () => select(i)));
});

// 업종별 자세히 보기: 전체 / 전문직 / 소상공인 필터
document.querySelectorAll<HTMLElement>('.v3-filter').forEach((group) => {
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const cards = [...document.querySelectorAll<HTMLElement>('.v3-card[data-cat]')];
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      cards.forEach((card) => {
        card.hidden = !(filter === 'all' || card.dataset.cat === filter);
      });
    });
  });
});
