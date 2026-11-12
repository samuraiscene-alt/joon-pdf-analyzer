# JOON PDF ANALYZER

독립 부동산 경매 문서 판독 테스트 PWA — v0.6.0

## 기능
- 일반 PDF 문자/좌표 추출: PDF.js
- 이미지 및 스캔 PDF OCR: Tesseract.js (한국어+영어)
- 표 구조 후보 추출, 임차인별 잠정 기록, 경매 키워드 탐색
- 원본+분석 결과: 기기 IndexedDB 보관
- 독립 판독 보고서 JSON, 경매앱 연동 검토용 JSON

## 실행
GitHub Pages: https://samuraiscene-alt.github.io/joon-pdf-analyzer/

저장소 Settings → Pages → Build and deployment → Source: **GitHub Actions** 로 설정해야 공개 배포가 활성화됩니다. Pages 설정/실제 접속 성공은 별도 확인해야 합니다.

## 테스트
Node.js 설치 환경에서 `npm test` (23개 단위 테스트). **모의 데이터 기반** 테스트로 실제 법원 문서의 정확도를 입증하지 않습니다.

## 독립 검증 순서
1. 처음 보는 원본 법원 서류를 **앱에 직접** 등록
2. 앱이 자체 판독을 수행하고 독립 보고서를 먼저 내보냄
3. 그 후 원본과 대조하여 오류를 조사하고 수정
4. 이미 사용한 문서는 회귀 테스트에만 사용

## 안전
- 표 복원은 후보 단계이며, 여러 줄 병합셀 및 OCR 품질이 불확실할 수 있습니다.
- 임차인 수, 권리 순위, 인수 금액을 자동 확정하지 않습니다.
- 공개 GitHub 저장소에는 법원 원본 PDF/사진/개인정보/API 키를 올리지 않습니다.
- IndexedDB는 영구 보존이 보장되지 않습니다. 원본을 따로 백업하세요.
- PDF.js·Tesseract.js 관련 최초 다운로드는 CDN 연결이 필요할 수 있습니다.
- 기존 부동산 경매앱은 수정하지 않았습니다.
