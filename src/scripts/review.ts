const params = new URLSearchParams(location.search);
if (params.get('review') === '1') {
  document.body.classList.add('is-review');
  type Feedback = {
    id: string;
    path: string;
    section: string;
    title: string;
    text: string;
    at: string;
  };
  const storageKey = 'somunnan-review-v1';
  let feedback: Feedback[] = [];
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved))
      feedback = saved
        .filter(
          (item) =>
            item &&
            ['id', 'path', 'section', 'title', 'text', 'at'].every(
              (key) => typeof item[key] === 'string',
            ),
        )
        .slice(0, 200);
  } catch {
    storageAvailable = false;
  }

  // Review persists on internal navigation; form values never enter URLs.
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || link.hasAttribute('download')) return;
    url.searchParams.set('review', '1');
    link.href = url.pathname + url.search + url.hash;
  });
  const dock = document.createElement('aside');
  dock.className = 'review-dock';
  dock.setAttribute('aria-label', '리뷰 도구');
  dock.innerHTML = `<div><strong>리뷰 모드</strong><span data-review-count>의견 0개</span></div><button data-review-list>의견 보기</button><button data-review-copy>전체 복사</button><button data-review-download>파일로 받기</button><a data-review-exit>리뷰 종료</a><p data-review-status aria-live="polite">이 브라우저에만 저장됩니다. 공유하려면 복사하거나 파일로 보내주세요.</p><details class="review-analytics"><summary>방문 분석 확인 <span>외부 전송 꺼짐</span></summary><ul data-event-log></ul></details>`;
  const exitLink = dock.querySelector<HTMLAnchorElement>('[data-review-exit]')!;
  const exitUrl = new URL(location.href);
  exitUrl.searchParams.delete('review');
  exitLink.href = exitUrl.pathname + exitUrl.search + exitUrl.hash;
  document.body.append(dock);

  const dialog = document.createElement('dialog');
  dialog.className = 'review-dialog';
  dialog.setAttribute('aria-labelledby', 'review-dialog-title');
  dialog.innerHTML = `<div class="review-dialog-top"><h2 id="review-dialog-title">피드백 남기기</h2><button data-review-close aria-label="닫기">×</button></div><p data-review-target></p><form data-review-form><label for="review-comment">수정했으면 하는 내용을 알려주세요.</label><textarea id="review-comment" rows="5" maxlength="2000" required placeholder="예: 제목을 조금 짧게 바꾸면 좋겠어요."></textarea><p class="review-help">개인정보는 적지 마세요. 서버로 전송되지 않습니다.</p><button type="submit" class="button button-black">의견 저장</button></form><div data-review-items hidden></div>`;
  document.body.append(dialog);
  const form = dialog.querySelector<HTMLFormElement>('form')!;
  const textarea = dialog.querySelector<HTMLTextAreaElement>('textarea')!;
  const items = dialog.querySelector<HTMLElement>('[data-review-items]')!;
  const status = dock.querySelector<HTMLElement>('[data-review-status]')!;
  const title = dialog.querySelector<HTMLElement>('h2')!;
  const target = dialog.querySelector<HTMLElement>('[data-review-target]')!;
  let current = { section: '', title: '' };
  let returnFocus: HTMLElement | null = null;
  const updateCount = () => {
    dock.querySelector<HTMLElement>('[data-review-count]')!.textContent =
      `의견 ${feedback.length}개`;
  };
  const persist = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(feedback));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
    }
    updateCount();
    status.textContent = storageAvailable
      ? '이 브라우저에 저장했습니다. 작성자에게 자동 전달되지는 않습니다.'
      : '브라우저 저장이 불가능합니다. 페이지를 닫기 전에 복사하거나 파일로 받아주세요.';
  };
  const show = (button: HTMLElement) => {
    returnFocus = button;
    dialog.showModal();
  };
  dialog
    .querySelector<HTMLButtonElement>('[data-review-close]')!
    .addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => returnFocus?.focus());

  document.querySelectorAll<HTMLElement>('[data-review-id]').forEach((section) => {
    const id = section.dataset.reviewId!;
    const label = section.dataset.reviewTitle || id;
    const control = document.createElement('div');
    control.className = 'review-section-control';
    const badge = document.createElement('span');
    badge.textContent = `${id} ${label}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '피드백 남기기';
    button.setAttribute('aria-label', `${id} ${label} 피드백 남기기`);
    button.addEventListener('click', () => {
      current = { section: id, title: label };
      title.textContent = '피드백 남기기';
      target.textContent = `${id} · ${label}`;
      form.hidden = false;
      items.hidden = true;
      textarea.value = '';
      show(button);
      textarea.focus();
    });
    control.append(badge, button);
    section.prepend(control);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = textarea.value.trim();
    if (!text) {
      textarea.setCustomValidity('의견을 입력해주세요.');
      textarea.reportValidity();
      return;
    }
    if (feedback.length >= 200) {
      status.textContent = '의견이 200개입니다. 파일로 받은 뒤 기존 의견을 삭제해주세요.';
      dialog.close();
      return;
    }
    feedback.push({
      id: crypto.randomUUID(),
      path: location.pathname,
      section: current.section,
      title: current.title,
      text,
      at: new Date().toISOString(),
    });
    persist();
    dialog.close();
  });
  textarea.addEventListener('input', () => textarea.setCustomValidity(''));
  const renderList = () => {
    items.replaceChildren();
    if (!feedback.length) {
      const p = document.createElement('p');
      p.textContent = '아직 작성한 의견이 없습니다.';
      items.append(p);
    }
    feedback.forEach((item) => {
      const article = document.createElement('article');
      const heading = document.createElement('h3');
      heading.textContent = `${item.section} · ${item.title}`;
      const p = document.createElement('p');
      p.textContent = item.text;
      const meta = document.createElement('small');
      meta.textContent = `${item.path} · ${new Date(item.at).toLocaleDateString('ko-KR')}`;
      const remove = document.createElement('button');
      remove.textContent = '삭제';
      remove.addEventListener('click', () => {
        feedback = feedback.filter((row) => row.id !== item.id);
        persist();
        renderList();
      });
      article.append(heading, p, meta, remove);
      items.append(article);
    });
  };
  dock
    .querySelector<HTMLButtonElement>('[data-review-list]')!
    .addEventListener('click', (event) => {
      title.textContent = '작성한 의견';
      target.textContent = '이 브라우저에서 남긴 모든 페이지의 의견입니다.';
      form.hidden = true;
      items.hidden = false;
      renderList();
      show(event.currentTarget as HTMLElement);
    });
  const exportText = () =>
    `소문난 가게 홈페이지 검토 의견\n\n${feedback.map((item) => `[${item.section}] ${item.title}\n페이지: ${item.path}\n${item.text}`).join('\n\n') || '작성한 의견이 없습니다.'}`;
  dock
    .querySelector<HTMLButtonElement>('[data-review-copy]')!
    .addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(exportText());
        status.textContent = '전체 의견을 복사했습니다. 전달할 곳에 붙여넣어주세요.';
      } catch {
        status.textContent = '복사할 수 없습니다. ‘파일로 받기’를 이용해주세요.';
      }
    });
  dock.querySelector<HTMLButtonElement>('[data-review-download]')!.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([exportText()], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = '소문난가게_검토의견.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = '의견 파일을 내려받았습니다. 파일을 직접 전달해주세요.';
  });
  const log = dock.querySelector<HTMLUListElement>('[data-event-log]')!;
  const initial = document.createElement('li');
  initial.textContent = 'page_view · 현재 페이지';
  log.append(initial);
  document.addEventListener('somunnan:analytics-preview', ((event: CustomEvent) => {
    const li = document.createElement('li');
    li.textContent = `${event.detail.name} ${JSON.stringify(event.detail.parameters)}`;
    log.prepend(li);
    while (log.children.length > 8) log.lastElementChild?.remove();
  }) as EventListener);
  updateCount();
  if (!storageAvailable)
    status.textContent = '저장 기능을 사용할 수 없습니다. 의견은 복사하거나 파일로 받아주세요.';
}
