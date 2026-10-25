// 상담 신청 전송. 받는 곳은 소유자 구글 계정의 Apps Script 웹앱(docs/intake/apps-script.gs)입니다.
// 주소는 환경 변수 PUBLIC_INTAKE_ENDPOINT 하나로 바꿉니다. 비어 있으면 폼이 미리보기 모드로 동작해
// 이 함수를 부르지 않습니다.

export interface IntakePayload {
  business: string;
  industry: string;
  industryLabel: string;
  contact: string;
  help: string;
  region: string;
  channel: string;
  concern: string;
  privacyConsent: 'Y';
  marketingConsent: 'Y' | 'N';
  consentVersion: string;
  website: string; // 스팸 방지 칸. 사람이 쓰면 늘 비어 있습니다.
}

export interface IntakeReceipt {
  id: string;
}

const TIMEOUT_MS = 15000;

export async function submitIntake(payload: IntakePayload): Promise<IntakeReceipt> {
  const endpoint = import.meta.env.PUBLIC_INTAKE_ENDPOINT || '';
  if (!endpoint) throw new Error('intake endpoint missing');

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // text/plain 으로 보내야 브라우저가 사전 확인(preflight) 없이 Apps Script 로 바로 보냅니다.
    const response = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const result = (await response.json()) as { ok?: boolean; id?: string };
    // 시트에 실제로 저장됐다는 응답일 때만 성공으로 봅니다.
    if (!result.ok || !result.id) throw new Error('not saved');
    return { id: result.id };
  } finally {
    window.clearTimeout(timer);
  }
}
