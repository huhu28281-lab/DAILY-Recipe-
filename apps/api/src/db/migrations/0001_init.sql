-- 0001_init.sql
-- Smart Meal Planner D1 스키마 뼈대. 명세 §7 데이터 스키마 대응.
-- 컬럼 상세/인덱스/제약조건은 기능 구현 단계(§11 순서 0)에서 채운다.

CREATE TABLE IF NOT EXISTS allergen_master (
  allergen_id TEXT PRIMARY KEY,
  name_ko TEXT NOT NULL,
  is_mandatory_label INTEGER NOT NULL DEFAULT 1
);

-- category는 §7 예시에서 관측된 값(protein/seafood/dairy/vegetable/grain/seasoning/fruit)으로 제한한다.
-- 새 카테고리가 필요하면 이 CHECK를 갱신하는 마이그레이션을 추가한다.
CREATE TABLE IF NOT EXISTS ingredient_master (
  ingredient_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('protein', 'seafood', 'dairy', 'vegetable', 'grain', 'seasoning', 'fruit')),
  default_unit TEXT NOT NULL,
  default_package_quantity REAL,
  -- §2.2/§2.4: 양념류(간장·참기름·소금 등)는 냉장고 활용 지표 분모와 끼니 비용 계산에서 제외한다.
  is_staple INTEGER NOT NULL DEFAULT 0 CHECK (is_staple IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_ingredient_master_category ON ingredient_master(category);

-- V-01 알레르기 유니온 판정은 재료명 문자열이 아니라 이 매핑으로 한다 (§5).
-- 재료에 알레르기가 없으면 행을 아예 넣지 않는다 (없음 = 매핑 부재).
CREATE TABLE IF NOT EXISTS ingredient_allergen_tags (
  ingredient_id TEXT NOT NULL REFERENCES ingredient_master(ingredient_id),
  allergen_id TEXT NOT NULL REFERENCES allergen_master(allergen_id),
  PRIMARY KEY (ingredient_id, allergen_id)
);

CREATE INDEX IF NOT EXISTS idx_ingredient_allergen_tags_allergen ON ingredient_allergen_tags(allergen_id);

-- 식약처 영양성분 DB 기준 100g/100ml당 값. 가격과 달리 배치 갱신 대상이 아니라 버전(날짜) 컬럼을 두지 않는다.
CREATE TABLE IF NOT EXISTS nutrition_facts (
  ingredient_id TEXT PRIMARY KEY REFERENCES ingredient_master(ingredient_id),
  kcal_per_100g REAL NOT NULL,
  carb_g_per_100g REAL NOT NULL,
  protein_g_per_100g REAL NOT NULL,
  fat_g_per_100g REAL NOT NULL
);

-- KAMIS/aT 공개 시세, 주 1회 배치 갱신 (§2.4). ingredient_id당 기준일별로 한 행씩 쌓여 이력이 된다.
-- 가격을 못 찾은 재료는 package_quantity/package_price_krw를 NULL로 두고 price_source='unavailable'로 기록한다
-- (조회 자체를 안 한 게 아니라 '확인했지만 없었다'는 사실을 남기기 위함 — grocery_list의 has_unpriced_ingredient 판정 근거).
CREATE TABLE IF NOT EXISTS price_reference (
  ingredient_id TEXT NOT NULL REFERENCES ingredient_master(ingredient_id),
  package_quantity REAL,
  package_price_krw INTEGER,
  price_source TEXT NOT NULL CHECK (price_source IN ('KAMIS', 'aT', 'unavailable')),
  price_reference_date TEXT NOT NULL,
  PRIMARY KEY (ingredient_id, price_reference_date)
);

-- "가장 최근 기준일 가격"을 찾는 조회 패턴을 위한 인덱스.
CREATE INDEX IF NOT EXISTS idx_price_reference_ingredient_date ON price_reference(ingredient_id, price_reference_date);

CREATE TABLE IF NOT EXISTS households (
  household_id TEXT PRIMARY KEY,
  nutrition_target_ratio_json TEXT NOT NULL -- { carb, protein, fat }
);

CREATE TABLE IF NOT EXISTS family_members (
  member_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(household_id),
  label TEXT NOT NULL,
  role TEXT NOT NULL,
  activity_level TEXT NOT NULL,
  diet_profile TEXT NOT NULL DEFAULT 'standard',
  allergens_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS weekly_plans (
  plan_id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(household_id),
  schema_version TEXT NOT NULL,
  week_start_date TEXT NOT NULL,
  plan_json TEXT NOT NULL -- WeeklyPlan 전체 스냅샷 (src/types/schema.ts)
);

CREATE TABLE IF NOT EXISTS meal_feedback (
  household_id TEXT NOT NULL REFERENCES households(household_id),
  menu_name TEXT NOT NULL,
  feedback TEXT NOT NULL, -- 'like' | 'dislike'
  created_at TEXT NOT NULL,
  PRIMARY KEY (household_id, menu_name, created_at)
);

CREATE TABLE IF NOT EXISTS seasonal_ingredients (
  month INTEGER NOT NULL,
  ingredient_id TEXT NOT NULL REFERENCES ingredient_master(ingredient_id),
  reason_nutrient TEXT,
  PRIMARY KEY (month, ingredient_id)
);
