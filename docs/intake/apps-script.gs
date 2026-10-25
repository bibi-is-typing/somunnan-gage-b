/**
 * 소문난 가게 — 상담 신청 받는 곳 (Google Apps Script 웹앱)
 *
 * 하는 일
 *  - 홈페이지 상담 신청을 이 스프레드시트의 '상담신청' 탭에 한 줄씩 저장
 *  - 알림 메일 발송 (NOTIFY_EMAIL)
 *  - 같은 연락처로 10분 안에 다시 들어온 신청은 '중복'으로 표시하고 메일은 보내지 않음
 *  - 보관 기간(RETENTION_DAYS, 기본 365일)이 지난 신청은 매일 새벽 자동 삭제
 *
 * 설치는 docs/intake/설치-가이드.md 를 따라 하세요. 이 파일을 Apps Script 편집기에 통째로 붙여넣습니다.
 * 이메일 주소 같은 설정값은 코드에 적지 않고 [프로젝트 설정 → 스크립트 속성]에 넣습니다.
 */

const SHEET_NAME = '상담신청';
const COLUMNS = [
  '접수번호', '접수 시각', '상호명', '업종', '연락처', '도움 유형',
  '지역', '운영 채널', '고민 내용', '개인정보 동의', '동의 문구 버전',
  '소식 수신 동의', '처리 상태', '메모',
];
const HELP_LABEL = { consulting: '방향 상담', management: '운영 대행', unknown: '아직 모르겠어요' };
const DUPLICATE_MINUTES = 10;

function doPost(e) {
  try {
    const p = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // 스팸 봇: 숨김 칸이 채워져 있으면 저장하지 않고 성공처럼 응답
    if (p.website) return json({ ok: true, id: 'ignored' });

    // 필수 항목·동의 확인 (화면에서 한 번, 여기서 한 번 더)
    if (!clean(p.business) || !clean(p.industry) || !clean(p.contact) || p.privacyConsent !== 'Y') {
      return json({ ok: false, error: 'missing' });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSheet();
      const now = new Date();
      const id = Utilities.formatDate(now, 'Asia/Seoul', 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase();
      const contact = String(p.contact).slice(0, 30).replace(/[^0-9+\-]/g, ''); // 숫자·+·- 만
      const duplicate = isRecentDuplicate(sheet, contact, now);

      sheet.appendRow([
        id,
        now,
        clean(p.business),
        clean(p.industryLabel || p.industry),
        "'" + contact, // 앞자리 0이 사라지지 않게 글자로 저장
        HELP_LABEL[p.help] || '',
        clean(p.region),
        clean(p.channel),
        clean(p.concern),
        '동의',
        clean(p.consentVersion),
        p.marketingConsent === 'Y' ? '동의' : '-',
        duplicate ? '중복' : '새 신청',
        '',
      ]);

      if (!duplicate) notify(id, p, contact);
      return json({ ok: true, id: id });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'server' });
  }
}

// 브라우저로 주소를 열었을 때 살아 있는지 확인용
function doGet() {
  return json({ ok: true, service: 'somunnan-intake' });
}

function notify(id, p, contact) {
  const to = prop('NOTIFY_EMAIL');
  if (!to) return;
  if (MailApp.getRemainingDailyQuota() < 1) {
    console.warn('메일 하루 한도 초과 — 시트에는 저장됨');
    return;
  }
  MailApp.sendEmail({
    to: to,
    subject: '[소문난 가게] 새 상담 신청 — ' + clean(p.business),
    body: [
      '접수번호: ' + id,
      '상호명: ' + clean(p.business),
      '업종: ' + clean(p.industryLabel || p.industry),
      '연락처: ' + contact,
      '도움 유형: ' + (HELP_LABEL[p.help] || '-'),
      '지역: ' + (clean(p.region) || '-'),
      '운영 채널: ' + (clean(p.channel) || '-'),
      '고민 내용: ' + (clean(p.concern) || '-'),
      '소식 수신 동의: ' + (p.marketingConsent === 'Y' ? '동의' : '아니오'),
      '',
      '시트에서 보기: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl(),
      '연락 후 시트의 "처리 상태"를 바꿔주세요. (새 신청 → 연락 완료 → 계약 / 보류)',
    ].join('\n'),
  });
}

function isRecentDuplicate(sheet, contact, now) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  const from = Math.max(2, last - 30);
  const rows = sheet.getRange(from, 2, last - from + 1, 4).getValues(); // 접수 시각 ~ 연락처
  return rows.some(function (r) {
    return String(r[3]).replace(/\s/g, '') === contact && now - new Date(r[0]) < DUPLICATE_MINUTES * 60000;
  });
}

// 보관 기간이 지난 신청 삭제. setup() 이 매일 새벽 3시에 실행되도록 등록합니다.
function deleteExpired() {
  const days = Number(prop('RETENTION_DAYS') || 365);
  const sheet = getSheet();
  const last = sheet.getLastRow();
  if (last < 2) return;
  const cutoff = Date.now() - days * 86400000;
  const dates = sheet.getRange(2, 2, last - 1, 1).getValues();
  for (let i = dates.length - 1; i >= 0; i--) {
    if (new Date(dates[i][0]).getTime() < cutoff) sheet.deleteRow(i + 2);
  }
}

// 설치할 때 한 번만 실행: 시트 머리줄과 매일 자동 삭제 예약
function setup() {
  getSheet();
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'deleteExpired'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('deleteExpired').timeBased().everyDays(1).atHour(3).create();
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
  }
  return sheet;
}

function prop(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

// 길이 제한 + 시트 수식 주입 방지(=, +, -, @ 로 시작하면 글자로 저장)
function clean(v) {
  return String(v == null ? '' : v).slice(0, 1000).replace(/^[=+\-@]/, "'$&");
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
