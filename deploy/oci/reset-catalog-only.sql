PRAGMA foreign_keys = ON;

-- 운영 초기화용 카탈로그 전용 정리 스크립트다.
-- 제품, 제품 안내, 브랜드 애셋, 제품 출처 사실, 외부 성과는 보존한다.
-- 개인 데이터는 참조 순서의 역순으로 지우므로 반복 실행해도 같은 결과가 된다.
BEGIN IMMEDIATE;

DELETE FROM conversation_message_source;
DELETE FROM rescue_plan;
DELETE FROM conversation_message;
DELETE FROM conversation;
DELETE FROM notification;
DELETE FROM pattern_evidence;
DELETE FROM personal_pattern;
DELETE FROM comparison_baseline;
DELETE FROM experience_tag;
DELETE FROM experience_record;
DELETE FROM experience_session;
DELETE FROM routine_item;
DELETE FROM routine_insight_keyword;
DELETE FROM routine_insight;
UPDATE routine SET based_on_routine_id = NULL;
DELETE FROM routine;
DELETE FROM user_product;
DELETE FROM user_skin_profile;
DELETE FROM user_preference;
DELETE FROM user_onboarding;
DELETE FROM auth_access_token;
DELETE FROM app_user;

DELETE FROM sqlite_sequence
 WHERE name IN (
    'app_user', 'user_product', 'routine', 'routine_item',
    'experience_session', 'experience_record', 'personal_pattern',
    'notification', 'conversation', 'conversation_message', 'rescue_plan'
 );

COMMIT;

PRAGMA foreign_key_check;
