# Smart Meal Planner — Monorepo

`docs/meal_planner_app_spec_v1.2.md` 명세 기준의 모노레포 스캐폴딩. 아직 기능은 구현되어 있지 않고 폴더 구조·설정 파일만 준비되어 있다.

## 구조

```
.
├── apps/
│   ├── mobile/     # Flutter 앱 (탭: 식단 캘린더 · 식재료 · 리포트 · 가족)
│   └── api/        # Cloudflare Workers 백엔드 (생성 파이프라인, 검증 가드, DB 연동)
├── packages/
│   └── contracts/  # 프런트·백엔드가 공유하는 데이터 계약 (§7 스키마, 픽스처)
└── docs/
    └── meal_planner_app_spec_v1.2.md
```

## 왜 이렇게 나눴는가

* **`apps/mobile`** — 명세 §9~10의 화면·디자인 시스템을 구현하는 클라이언트. 민감정보(알레르기·식이 목표)는 단말 로컬 저장이 기본이라(§8) 서버와 독립적으로 동작할 수 있어야 한다.
* **`apps/api`** — 명세 §5 생성 파이프라인(입력 정규화 → 제약 계산 → LLM 생성 → 검증 가드 V-01~V-05 → 수치 채우기 → 지표 산출)과 §2.4 비용 계산(가격 DB 배치 갱신)을 담당. LLM은 메뉴만 생성하고 가격·칼로리는 절대 생성하지 않는다는 원칙(§1)에 따라 이 계산은 반드시 서버 쪽에 있어야 한다.
* **`packages/contracts`** — §7의 JSON 스키마(`weekly_plan`)를 앱과 API가 각자의 언어(Dart / TypeScript)로 옮기기 전, 진실의 원천으로 두는 곳. 필드 이름(`_per_person`/`_household`, `meal_extra_cost`/`meal_total_cost`/`grocery_total_cost` 등)이 양쪽에서 갈라지는 걸 막는다.

## 시작하기

### API (Cloudflare Workers)

```bash
cd apps/api
npm install
npm run dev
```

Wrangler 시크릿(`.dev.vars`, 커밋 금지)에 LLM API 키와 KAMIS/aT 가격 API 키를 넣어야 한다. `apps/api/.dev.vars.example` 참고.

### 모바일 (Flutter)

```bash
cd apps/mobile
flutter pub get
flutter run
```

## 착수 전 확인 사항 (§11)

KAMIS·aT 공개 API의 상업적 이용 조건과 호출 제한을 먼저 확인한다. 여기가 막히면 §2.4 비용 기능 전체를 다시 설계해야 한다.
