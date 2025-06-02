# GitHub 릴리스 분석 대시보드

GitHub 레포지토리의 릴리스 데이터를 수집하고 분석하여 시각화하는 대시보드 애플리케이션입니다.

## 주요 기능

- **릴리스 통계 분석**
  - 레포지토리별 월간 릴리스 추이
  - 요일별 릴리스 분포
  - 릴리스 타입 분석 (일반/프리릴리스/초안)
  - 평균 릴리스 간격

- **데이터 필터링**
  - 기간별 데이터 조회
  - 레포지토리별 데이터 필터링

- **자동 데이터 수집**
  - GitHub API를 통한 실시간 데이터 수집
  - 주기적인 데이터 업데이트

## 기술 스택

- **프론트엔드**
  - React
  - TypeScript
  - Material-UI
  - Recharts

- **백엔드**
  - Node.js
  - Fastify
  - TypeScript
  - Octokit

## 설치 및 실행

### 초기 설치

```bash
# 프로젝트 루트 디렉토리에서 실행
pnpm install
```

### 개발 서버 실행

```bash
# 클라이언트 및 서버 동시 실행
pnpm dev

# 클라이언트만 실행
pnpm dev:client

# 서버만 실행
pnpm dev:server
```

### 테스트 실행

```bash
# 클라이언트 테스트
pnpm test:client

# 서버 테스트
pnpm test:server

# 모든 테스트 실행
pnpm test
```

### 빌드

```bash
# 클라이언트 및 서버 빌드
pnpm build
```

## 환경 변수 설정

- 클라이언트: `client/.env` 파일에 설정 (예시는 `client/.env.example` 참조)
- 서버: `server/.env` 파일에 설정 (예시는 `server/.env.example` 참조)

## API 엔드포인트

서버는 다음과 같은 API 엔드포인트를 제공합니다:

- `GET /api/data`: 릴리스 데이터 조회
  - 쿼리 파라미터:
    - `startDate`: 시작일 (YYYY-MM-DD)
    - `endDate`: 종료일 (YYYY-MM-DD)
    - `repository`: 특정 레포지토리 필터링 (선택사항)

## ChangeLog
- 서버 측:
  - 데이터 처리 로직을 서버로 이동
  - API 응답 타입 정의 (DashboardData 인터페이스)
  - 데이터 가공 함수들 추가 (월별, 요일별, 타입별, 통계)
  - 필터링 로직 개선 (기간, 레포지토리)
- 클라이언트 측:
  - 데이터 처리 로직 제거
  - 서버 API 응답 타입에 맞게 인터페이스 수정
  - 데이터 표시 로직 단순화
  - 상수 값들을 상단으로 이동