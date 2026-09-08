-- 001_allergen_master.sql
-- 식약처 표시 대상 알레르기 22종. 명세 §4.1.
-- "서버 설정에서 로드한다. 하드코딩 금지 — 고시 개정으로 바뀐다."
-- 이 파일이 그 서버 설정의 실체다 — 코드에는 목록을 두지 않고 이 시드로만 채운다.
-- 모든 환경(로컬/스테이징/프로덕션)에 동일하게 적용하는 참조 데이터이며, 재실행해도 안전하다(OR REPLACE).

INSERT OR REPLACE INTO allergen_master (allergen_id, name_ko, is_mandatory_label) VALUES
  ('egg',        '난류',   1),
  ('milk',       '우유',   1),
  ('buckwheat',  '메밀',   1),
  ('peanut',     '땅콩',   1),
  ('soy',        '대두',   1),
  ('wheat',      '밀',     1),
  ('pine_nut',   '잣',     1),
  ('walnut',     '호두',   1),
  ('crab',       '게',     1),
  ('shrimp',     '새우',   1),
  ('squid',      '오징어', 1),
  ('mackerel',   '고등어', 1),
  ('shellfish',  '조개류', 1), -- 굴·전복·홍합 포함
  ('peach',      '복숭아', 1),
  ('tomato',     '토마토', 1),
  ('chicken',    '닭고기', 1),
  ('pork',       '돼지고기', 1),
  ('beef',       '쇠고기', 1),
  ('sulfites',   '아황산류', 1),
  ('almond',     '아몬드', 1),
  ('sesame',     '참깨',   1),
  ('corn',       '옥수수', 1);
