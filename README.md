# 소문난 가게 홈페이지 B안

소유자 검토용 1차 사이트입니다. Astro·TypeScript로 제작했고, 콘텐츠는 `src/data/site.ts`에서 관리합니다. 정식 접수, 결제, CMS는 연결하지 않았습니다.

## 보기

- 배포 화면: https://bibi-is-typing.github.io/somunnan-gage-b/
- 리뷰 모드: https://bibi-is-typing.github.io/somunnan-gage-b/?review=1
- 카페 게시물 3장: https://bibi-is-typing.github.io/somunnan-gage-b/examples/cafe-story/
- 상담 안내 카드 3장: https://bibi-is-typing.github.io/somunnan-gage-b/examples/professional-notes/
- 로컬 화면: http://127.0.0.1:4321/

GitHub Pages에 공유용으로 배포합니다. 검색 노출은 요청하지 않도록 noindex를 설정했지만, 주소를 아는 사람은 누구나 볼 수 있습니다. 신청서는 실제 정보를 접수하지 않으며 샘플은 실제 고객 실적이 아닙니다.

## 실행

Node.js 22.23.4 이상이 필요합니다. 프로젝트 폴더에서 실행합니다.

```sh
npm ci
npm run dev
```

현재 Astro 개발 서버는 백그라운드로 실행됩니다. 중지하려면 `npx astro dev stop`, 상태 확인은 `npx astro dev status`를 사용합니다. 주소가 열리지 않으면 `npm run dev`로 다시 시작합니다.

```sh
npm run check
node --test tests/analytics.test.mjs
npm run build
npm run preview
```

`dist/`가 정적 배포 결과물입니다. 개발 서버와 preview는 같은 기본 포트를 쓰므로 동시에 실행하지 않습니다.

## 자동 배포

`main` 브랜치에 변경을 push하면 GitHub Actions가 설치, 타입 검사, 분석 정책 테스트, 빌드를 거쳐 Pages에 배포합니다. 저장소의 **Actions → Deploy B site to GitHub Pages**에서 진행 상황과 실패 로그를 확인할 수 있습니다. 같은 화면의 **Run workflow**로 재배포할 수 있습니다.

- 배포 설정: `.github/workflows/deploy.yml`
- GitHub **Settings → Pages → Source**: GitHub Actions
- 로컬에서는 `/`, Pages에서는 `/somunnan-gage-b/` 경로를 사용합니다. 메뉴, 이미지, 완료 화면도 이 설정을 따릅니다.
- `SITE_URL`과 `SITE_BASE_PATH`는 Pages 설정에서 자동으로 가져옵니다. 계정이나 저장소를 이관한 후 새 저장소에서 Pages를 켜고 배포하면 새 주소가 반영됩니다.
- 정식 도메인을 연결한다면 Pages의 도메인 설정, `SITE_URL`·`SITE_BASE_PATH`, 검색 노출 설정을 함께 점검하세요.
- GA4는 기본 비활성입니다. 필요할 때 GitHub **Settings → Secrets and variables → Actions → Variables**에 `PUBLIC_GA4_ID`를 추가하고 재배포합니다. ID는 공개용 식별자입니다. 연결 전 확인 사항은 `ANALYTICS.md`를 따릅니다.

Pages 경로로 로컬 빌드만 확인하려면 다음을 실행합니다.

```sh
SITE_BASE_PATH=/somunnan-gage-b npm run build
```

## 바꿀 곳

| 내용 | 파일 |
| --- | --- |
| 업종, 샘플, 서비스, FAQ | src/data/site.ts |
| 홈 제목과 설명 | src/pages/index.astro |
| 공통 메뉴·푸터·마지막 문의 안내 | src/components/ |
| 색, 글자 크기, 여백, 모바일 배치 | src/styles/global.css |
| 폼·탭·샘플 넘기기 | src/scripts/site.ts |
| 피드백 작성·저장·내려받기 | src/scripts/review.ts |
| GA4 설정과 이벤트 | src/scripts/analytics.ts |

CSS는 초기 디자인과 수정안을 구분해 작성했습니다. 추가 수정 전 해당 요소의 반응형 규칙과 뒤쪽 수정 규칙을 함께 확인하세요.

## 비개발자 검토

1. 일반 화면에서 첫인상, 문구, 샘플을 봅니다.
2. `?review=1` 주소로 열어 해당 영역의 ‘피드백 남기기’를 누릅니다.
3. 의견은 현재 브라우저에만 저장됩니다. ‘전체 복사’ 또는 ‘파일로 받기’로 제작자에게 직접 전달합니다.
4. 의견 목록에서 수정할 의견을 삭제하고 다시 작성할 수 있습니다.
5. 승인된 문구와 실제 자료를 제작자가 반영하고 다시 검토합니다.

관리자 화면은 아직 없습니다. 정식 운영 전 수정 빈도를 보고 CMS 도입 여부를 결정합니다.

## 이관

`src/`, `public/`, 설정 파일, package.json, package-lock.json, 이 문서와 콘텐츠 검증 문서를 전달합니다. `node_modules/`, `.astro/`는 전달하지 않아도 됩니다. 도메인·호스팅·GA4는 고객 계정에 개설하고 제작자에게 필요한 권한을 주는 방식으로 준비합니다. 실제 접수함·운영 담당자·백업·삭제 정책은 공개 전에 정합니다.

세부 사항: `ANALYTICS.md`, `CONTENT_STATUS.md`, `DESIGN_NOTES.md`, `ASSETS.md`.
