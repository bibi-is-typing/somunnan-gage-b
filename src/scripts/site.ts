import { withBase } from '../utils/urls';
import { track } from './analytics';
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
  const context = () => ({
    industry: industry.value || 'unspecified',
    help: form.querySelector<HTMLInputElement>('input[name=help]:checked')?.value || 'unknown',
    form_type: 'consultation',
    mode: 'demo',
  });
  form.addEventListener('input', () => track('diagnosis_started', context(), true), { once: true });
  const label = form.querySelector<HTMLElement>('[data-submit-label]')!;
  button.disabled = false;
  type Field = HTMLInputElement | HTMLSelectElement;
  const fields = ['business', 'industry', 'contact', 'channel', 'demo-consent'];
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
    if (id === 'demo-consent' && !(field as HTMLInputElement).checked)
      message = '실제 접수가 없는 데모라는 안내를 확인해주세요.';
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
    button.disabled = true;
    label.textContent = '데모 화면으로 이동 중';
    status.textContent = '입력 내용을 전송하지 않고 완료 화면을 열고 있습니다.';
    // No FormData, network request, console logging or storage of field values.
    window.setTimeout(
      () => {
        try {
          sessionStorage.setItem(completionKey, String(Date.now()));
        } catch {
          button.disabled = false;
          label.textContent = '작성 내용 확인하기';
          status.textContent =
            '입력 확인을 마쳤습니다. 브라우저 저장 기능이 꺼져 있어 완료 화면으로 이동할 수 없습니다. 정보는 접수되지 않았습니다.';
          return;
        }
        track('diagnosis_demo_completed', context(), true);
        form.reset();
        window.location.assign(
          new URLSearchParams(location.search).get('review') === '1'
            ? withBase('/diagnosis/complete/?review=1')
            : withBase('/diagnosis/complete/'),
        );
      },
      motion.matches ? 0 : 450,
    );
  });
  window.addEventListener('pageshow', () => {
    button.disabled = false;
    label.textContent = '작성 내용 확인하기';
    status.textContent = '정보는 저장·전송되지 않습니다.';
  });
}

const completeHeading = document.querySelector<HTMLElement>('[data-complete-heading]');
if (completeHeading) {
  let completed = false;
  try {
    const timestamp = Number(sessionStorage.getItem(completionKey));
    completed = timestamp > 0 && Date.now() >= timestamp && Date.now() - timestamp < 120000;
    sessionStorage.removeItem(completionKey);
  } catch {
    /* Direct access falls back to the general demo explanation. */
  }
  if (completed) {
    completeHeading.textContent = '작성 내용을 확인했어요.';
    document.querySelector<HTMLElement>('[data-complete-copy]')!.textContent =
      '입력부터 완료까지 체험해주셔서 감사합니다. 입력한 내용은 저장하거나 전송하지 않았습니다.';
    const primary = document.querySelector<HTMLAnchorElement>('[data-complete-primary]')!;
    primary.textContent = '홈으로 돌아가기 →';
    primary.href =
      new URLSearchParams(location.search).get('review') === '1'
        ? withBase('/?review=1')
        : withBase('/');
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
