// 상담 신청 동의 문구와 개인정보처리방침이 함께 쓰는 내용.
// 한 곳에서만 고치면 신청 폼의 동의 안내와 /privacy/ 페이지가 같이 바뀝니다.
// 상태: 초안. 소유자(파테라) 확인 전이며, 확인 후 status 를 'final' 로 바꾸고 effectiveDate 를 채웁니다.
import { business } from './site';

export const privacy = {
  status: 'draft' as 'draft' | 'final',
  // 동의 문구가 바뀌면 버전도 바꿉니다. 접수 시트에 함께 기록되어 어떤 문구에 동의했는지 남습니다.
  consentVersion: '2026-10-26-draft',
  effectiveDate: '', // 예: '2026년 11월 1일'

  controller: business.name, // 개인정보처리자
  officer: { name: business.ceo, email: business.email }, // 개인정보 보호책임자

  // 상담 신청 (필수 동의)
  consultation: {
    purpose: '상담 신청 확인, 연락, 우리 가게에 맞는 운영 제안',
    required: ['상호명', '업종', '연락처'],
    optional: ['도움 유형', '지역', '운영 채널 주소', '고민 내용'],
    retention: '상담 신청일로부터 1년. 요청하시면 바로 삭제합니다.',
    refusal: '동의하지 않으실 수 있습니다. 다만 동의하지 않으면 상담 신청을 접수할 수 없습니다.',
  },

  // 소식·이벤트 안내 (선택 동의). 소유자가 사용하기로 정하면 enabled 를 true 로.
  marketing: {
    enabled: false,
    purpose: '새 서비스·이벤트·운영 팁 안내',
    items: ['연락처'],
    retention: '동의를 철회하실 때까지',
    refusal: '동의하지 않아도 상담 신청은 그대로 접수됩니다.',
  },

  // 처리 위탁·국외 이전 (구글 스프레드시트에 저장하고 Gmail 로 알림을 받기 때문)
  processors: [
    {
      name: 'Google LLC',
      task: '상담 신청 내용 저장(구글 스프레드시트)과 알림 메일 발송(Gmail)',
      country: '미국 등 Google 데이터센터 소재 국가',
      contact: 'https://support.google.com/policies',
    },
  ],

  // 방문 분석. GA4 측정 ID 가 있을 때만 처리방침에 표시됩니다.
  analytics: {
    tool: 'Google Analytics 4',
    items: '방문 페이지, 접속 기기·브라우저 정보, 대략적인 지역, 사이트 안 이용 기록(업종 선택, 상담 버튼 클릭 등)',
    note: '상호명·연락처·상담 내용은 방문 분석으로 보내지 않습니다.',
    optOut: '브라우저 설정에서 쿠키를 차단하거나, Google 애널리틱스 차단 브라우저 부가기능을 사용하실 수 있습니다.',
  },
};
