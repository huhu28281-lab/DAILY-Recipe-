// 식약처 표시 대상 22종 알레르기 마스터. 명세 §4.1.
// "서버 설정에서 로드한다. 하드코딩 금지 — 고시 개정으로 바뀐다."
// 실제 목록은 D1 테이블 allergen_master(src/db/migrations)에서 관리하고, 이 파일은 로더만 둔다.
// TODO: DB 로더 구현

export type AllergenMasterEntry = {
  allergenId: string;
  nameKo: string;
  isMandatoryLabel: boolean;
};
