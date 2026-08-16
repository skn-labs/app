package app.skn.data;

import app.skn.api.ApiModels.*;
import app.skn.auth.CurrentUser;
import app.skn.common.ApiException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Repository
public class SkincareRepository {
    public static final long DEMO_USER_ID = 1L;
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final CurrentUser currentUser;

    public SkincareRepository(JdbcTemplate jdbc, ObjectMapper objectMapper, CurrentUser currentUser) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.currentUser = currentUser;
    }

    public String displayName() {
        return jdbc.queryForObject("SELECT display_name FROM app_user WHERE id = ?", String.class, userId());
    }

    public List<ProductView> findProducts(String query) {
        return findProductsPage(query, 0, Integer.MAX_VALUE);
    }

    public List<ProductView> findProductsPage(String query, long cursorOffset, int fetchLimit) {
        String value = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        String like = "%" + value + "%";
        String prefix = value + "%";
        // 대표 제품과 브랜드 인지도를 이용한 탐색용 휴리스틱이며 안전성·적합성 점수가 아니다.
        return jdbc.query("""
                WITH
                featured_product(product_id, product_rank) AS (
                    VALUES
                      (1722, 1), (409, 2), (829, 3), (15, 4), (1439, 5), (425, 6),
                      (1924, 7), (1734, 8), (822, 9), (244, 10), (475, 11), (106, 12),
                      (436, 13), (828, 14), (103, 15), (434, 16), (210, 17), (225, 18),
                      (833, 19), (835, 20), (2109, 21), (322, 22), (415, 23), (220, 24)
                ),
                brand_popularity(brand, brand_rank) AS (
                    VALUES
                      ('라운드랩', 1), ('아누아', 2), ('토리든', 3), ('넘버즈인', 4),
                      ('마녀공장', 5), ('조선미녀', 6), ('코스알엑스', 7), ('닥터지', 8),
                      ('에스트라', 9), ('메디힐', 10), ('이니스프리', 11), ('라네즈', 12),
                      ('스킨1004', 13), ('구달', 14), ('닥터자르트', 15), ('메디큐브', 16),
                      ('달바', 17), ('아이오페', 18), ('헤라', 19), ('설화수', 20),
                      ('프리메라', 21), ('바이오던스', 22), ('리얼베리어', 23), ('일리윤', 24),
                      ('셀퓨전씨', 25), ('아비브', 26), ('퓨리토', 27), ('메이크프렘', 28),
                      ('클리오', 29), ('바닐라코', 30), ('토니모리', 31), ('에뛰드', 32),
                      ('홀리카홀리카', 33), ('VT코스메틱', 34), ('스킨푸드', 35), ('미샤', 36),
                      ('더페이스샵', 37), ('네이처리퍼블릭', 38), ('이즈앤트리', 39), ('웰라쥬', 40)
                ),
                catalog AS (
                    SELECT p.*,
                           EXISTS(SELECT 1 FROM user_product up WHERE up.user_id = ? AND up.product_id = p.id) AS owned,
                           (SELECT COUNT(DISTINCT er.id) FROM experience_record er
                              LEFT JOIN user_product eup ON eup.id = er.user_product_id
                              LEFT JOIN experience_session es ON es.id = er.session_id
                             WHERE er.user_id = ? AND (
                                   eup.product_id = p.id OR EXISTS (
                                       SELECT 1 FROM routine_item eri
                                       JOIN user_product rup ON rup.id = eri.user_product_id
                                       WHERE eri.routine_id = es.routine_id AND rup.product_id = p.id
                                   )
                             )) AS personal_record_count,
                           COALESCE(fp.product_rank, 10000) AS featured_rank,
                           COALESCE(bp.brand_rank, 1000) AS brand_popularity_rank,
                           CASE
                               WHEN ? = '' THEN 0
                               WHEN lower(p.name) = ? THEN 5
                               WHEN lower(p.brand) = ? THEN 4
                               WHEN lower(p.category) = ? THEN 4
                               WHEN lower(p.name) LIKE ? THEN 3
                               WHEN lower(p.brand) LIKE ? THEN 2
                               ELSE 1
                           END AS query_relevance
                      FROM product_catalog_public p
                      LEFT JOIN featured_product fp ON fp.product_id = p.id
                      LEFT JOIN brand_popularity bp ON bp.brand = p.brand
                     WHERE ? = '' OR lower(p.name) LIKE ? OR lower(p.brand) LIKE ? OR lower(p.category) LIKE ?
                ),
                ranked AS (
                    SELECT catalog.*,
                           ROW_NUMBER() OVER (
                               PARTITION BY brand
                               ORDER BY featured_rank, public_verified DESC, id
                           ) AS brand_product_rank
                      FROM catalog
                )
                SELECT * FROM ranked
                 ORDER BY query_relevance DESC,
                          featured_rank,
                          CASE WHEN featured_rank < 10000 THEN 0
                               ELSE brand_popularity_rank + ((brand_product_rank - 1) * 12)
                          END,
                          public_verified DESC,
                          id
                 LIMIT ?
                OFFSET ?
                """, this::mapProduct,
                userId(), userId(),
                value, value, value, value, prefix, prefix,
                value, like, like, like,
                fetchLimit, cursorOffset);
    }

    public Optional<ProductView> findProduct(long productId) {
        return jdbc.query("""
                SELECT p.*,
                       EXISTS(SELECT 1 FROM user_product up WHERE up.user_id = ? AND up.product_id = p.id) AS owned,
                       (SELECT COUNT(DISTINCT er.id) FROM experience_record er
                          LEFT JOIN user_product eup ON eup.id = er.user_product_id
                          LEFT JOIN experience_session es ON es.id = er.session_id
                         WHERE er.user_id = ? AND (
                               eup.product_id = p.id OR EXISTS (
                                   SELECT 1 FROM routine_item eri
                                   JOIN user_product rup ON rup.id = eri.user_product_id
                                   WHERE eri.routine_id = es.routine_id AND rup.product_id = p.id
                               )
                         )) AS personal_record_count
                  FROM product_catalog_public p WHERE p.id = ?
                """, this::mapProduct, userId(), userId(), productId).stream().findFirst();
    }

    public List<UserProductView> findUserProducts() {
        return jdbc.query("""
                SELECT up.id AS user_product_id, up.custom_brand, up.custom_name, up.custom_category,
                       up.memo, up.added_at, p.*,
                       COALESCE(p.brand_logo_url, custom_ba.logo_url) AS user_product_brand_logo_url,
                       CASE WHEN p.id IS NULL THEN 0 ELSE 1 END AS owned,
                       EXISTS(
                           SELECT 1 FROM routine r
                           JOIN routine_item ri ON ri.routine_id = r.id
                           WHERE r.user_id = up.user_id AND r.status = 'CURRENT'
                             AND ri.user_product_id = up.id
                       ) AS in_current_routine,
                       (SELECT COUNT(DISTINCT er.id) FROM experience_record er
                          LEFT JOIN experience_session es ON es.id = er.session_id
                         WHERE er.user_id = up.user_id AND (
                               er.user_product_id = up.id OR EXISTS (
                                   SELECT 1 FROM routine_item eri
                                   WHERE eri.routine_id = es.routine_id AND eri.user_product_id = up.id
                               )
                         )) AS personal_record_count
                  FROM user_product up
                  LEFT JOIN product_catalog_public p ON p.id = up.product_id
                  LEFT JOIN brand_asset custom_ba ON custom_ba.brand = up.custom_brand
                 WHERE up.user_id = ?
                 ORDER BY up.added_at DESC, up.id DESC
                """, this::mapUserProduct, userId());
    }

    public Optional<UserProductView> findUserProduct(long userProductId) {
        return jdbc.query("""
                SELECT up.id AS user_product_id, up.custom_brand, up.custom_name, up.custom_category,
                       up.memo, up.added_at, p.*,
                       COALESCE(p.brand_logo_url, custom_ba.logo_url) AS user_product_brand_logo_url,
                       CASE WHEN p.id IS NULL THEN 0 ELSE 1 END AS owned,
                       EXISTS(
                           SELECT 1 FROM routine r
                           JOIN routine_item ri ON ri.routine_id = r.id
                           WHERE r.user_id = up.user_id AND r.status = 'CURRENT'
                             AND ri.user_product_id = up.id
                       ) AS in_current_routine,
                       (SELECT COUNT(DISTINCT er.id) FROM experience_record er
                          LEFT JOIN experience_session es ON es.id = er.session_id
                         WHERE er.user_id = up.user_id AND (
                               er.user_product_id = up.id OR EXISTS (
                                   SELECT 1 FROM routine_item eri
                                   WHERE eri.routine_id = es.routine_id AND eri.user_product_id = up.id
                               )
                         )) AS personal_record_count
                  FROM user_product up
                  LEFT JOIN product_catalog_public p ON p.id = up.product_id
                  LEFT JOIN brand_asset custom_ba ON custom_ba.brand = up.custom_brand
                 WHERE up.user_id = ? AND up.id = ?
                """, this::mapUserProduct, userId(), userProductId).stream().findFirst();
    }

    public Optional<UserProductView> findOwnedCatalogProduct(long productId) {
        return jdbc.query("""
                SELECT up.id AS user_product_id, up.custom_brand, up.custom_name, up.custom_category,
                       up.memo, up.added_at, p.*,
                       p.brand_logo_url AS user_product_brand_logo_url, 1 AS owned,
                       EXISTS(
                           SELECT 1 FROM routine r
                           JOIN routine_item ri ON ri.routine_id = r.id
                           WHERE r.user_id = up.user_id AND r.status = 'CURRENT'
                             AND ri.user_product_id = up.id
                       ) AS in_current_routine,
                       (SELECT COUNT(DISTINCT er.id) FROM experience_record er
                          LEFT JOIN experience_session es ON es.id = er.session_id
                         WHERE er.user_id = up.user_id AND (
                               er.user_product_id = up.id OR EXISTS (
                                   SELECT 1 FROM routine_item eri
                                   WHERE eri.routine_id = es.routine_id AND eri.user_product_id = up.id
                               )
                         )) AS personal_record_count
                  FROM user_product up JOIN product_catalog_public p ON p.id = up.product_id
                 WHERE up.user_id = ? AND p.id = ?
                """, this::mapUserProduct, userId(), productId).stream().findFirst();
    }

    public long insertCatalogUserProduct(long productId, String memo) {
        Long id = jdbc.queryForObject("""
                INSERT INTO user_product(user_id, product_id, memo) VALUES (?, ?, ?) RETURNING id
                """, Long.class, userId(), productId, blankToNull(memo));
        return id == null ? 0 : id;
    }

    public long insertCustomUserProduct(String brand, String name, String category, String memo) {
        Long id = jdbc.queryForObject("""
                INSERT INTO user_product(user_id, custom_brand, custom_name, custom_category, memo)
                VALUES (?, ?, ?, ?, ?) RETURNING id
                """, Long.class, userId(), blankToNull(brand), name.trim(), blankToNull(category), blankToNull(memo));
        return id == null ? 0 : id;
    }

    public Optional<RoutineView> findCurrentRoutine() {
        return findRoutineByStatus("CURRENT");
    }

    public Optional<RoutineView> findBaselineRoutine() {
        return jdbc.query("""
                SELECT r.id, r.name, r.day_part, r.status, r.started_at
                  FROM comparison_baseline cb
                  JOIN routine r ON r.id = cb.routine_id
                 WHERE cb.user_id = ? AND cb.ended_at IS NULL
                 ORDER BY cb.id DESC LIMIT 1
                """, (rs, rowNum) -> mapRoutine(rs), userId()).stream().findFirst();
    }

    public List<RoutineView> findBaselineRoutines(int limit) {
        return jdbc.query("""
                SELECT r.id, r.name, r.day_part, r.status, r.started_at
                  FROM comparison_baseline cb
                  JOIN routine r ON r.id = cb.routine_id
                 WHERE cb.user_id = ?
                 ORDER BY cb.id DESC
                 LIMIT ?
                """, (rs, rowNum) -> mapRoutine(rs), userId(), limit);
    }

    private Optional<RoutineView> findRoutineByStatus(String status) {
        return jdbc.query("""
                SELECT id, name, day_part, status, started_at
                  FROM routine WHERE user_id = ? AND status = ? ORDER BY id DESC LIMIT 1
                """, (rs, rowNum) -> mapRoutine(rs), userId(), status).stream().findFirst();
    }

    public Optional<RoutineView> findRoutine(long routineId) {
        return jdbc.query("""
                SELECT id, name, day_part, status, started_at
                  FROM routine WHERE user_id = ? AND id = ?
                """, (rs, rowNum) -> mapRoutine(rs), userId(), routineId).stream().findFirst();
    }

    public List<Long> findRoutineUserProductIds(long routineId) {
        return jdbc.query("""
                SELECT ri.user_product_id FROM routine_item ri
                JOIN routine r ON r.id = ri.routine_id
                WHERE r.user_id = ? AND r.id = ? ORDER BY ri.position
                """, (rs, rowNum) -> rs.getLong(1), userId(), routineId);
    }

    public List<RoutineItemInput> findRoutineItemInputs(long routineId) {
        return jdbc.query("""
                SELECT ri.user_product_id, ri.time_slot, ri.frequency FROM routine_item ri
                JOIN routine r ON r.id = ri.routine_id
                WHERE r.user_id = ? AND r.id = ?
                ORDER BY ri.position
                """, (rs, rowNum) -> new RoutineItemInput(
                rs.getLong("user_product_id"), rs.getString("time_slot"), rs.getString("frequency")
        ), userId(), routineId);
    }

    public void archiveCurrentRoutine() {
        jdbc.update("UPDATE routine SET status = 'PAST', ended_at = datetime('now') WHERE user_id = ? AND status = 'CURRENT'", userId());
    }

    public long insertRoutine(String name, String dayPart, Long basedOnRoutineId, List<RoutineItemInput> items) {
        Long id = jdbc.queryForObject("""
                INSERT INTO routine(user_id, name, day_part, status, based_on_routine_id)
                VALUES (?, ?, ?, 'CURRENT', ?) RETURNING id
        """, Long.class, userId(), name, dayPart, basedOnRoutineId);
        if (id == null) throw new IllegalStateException("루틴 ID를 만들 수 없습니다.");
        for (int index = 0; index < items.size(); index++) {
            RoutineItemInput item = items.get(index);
            int position = index + 1;
            jdbc.update("""
                    INSERT INTO routine_item(routine_id, user_product_id, time_slot, position, frequency)
                    VALUES (?, ?, ?, ?, ?)
                    """, id, item.userProductId(), item.timeSlot(), position, item.frequency());
        }
        return id;
    }

    public boolean renameCurrentRoutine(long routineId, String name) {
        int updated = jdbc.update("""
                UPDATE routine
                   SET name = ?
                 WHERE user_id = ? AND id = ? AND status = 'CURRENT'
                """, name, userId(), routineId);
        if (updated == 0) return false;
        jdbc.update("""
                UPDATE experience_session
                   SET title = ?
                 WHERE user_id = ? AND routine_id = ? AND status = 'ACTIVE'
                """, name, userId(), routineId);
        return true;
    }

    public void closeActiveExperience(String reason) {
        jdbc.update("""
                UPDATE experience_session
                   SET status = 'CANCELLED', ended_at = datetime('now'), end_reason = ?
                 WHERE user_id = ? AND status = 'ACTIVE'
                """, reason, userId());
        jdbc.update("""
                UPDATE notification
                   SET cancelled_at = COALESCE(cancelled_at, datetime('now'))
                 WHERE user_id = ? AND completed_at IS NULL AND cancelled_at IS NULL
                   AND experience_id IN (
                       SELECT id FROM experience_session
                        WHERE user_id = ? AND status = 'CANCELLED'
                   )
                """, userId(), userId());
    }

    public Optional<Long> findSessionIdByClientRequest(String clientRequestId) {
        return jdbc.query("SELECT id FROM experience_session WHERE user_id = ? AND client_request_id = ?",
                (rs, rowNum) -> rs.getLong(1), userId(), clientRequestId).stream().findFirst();
    }

    public long insertExperienceSession(String subjectType, Long routineId, Long userProductId, String title, String clientRequestId) {
        Long id = jdbc.queryForObject("""
                INSERT INTO experience_session(
                    user_id, subject_type, routine_id, user_product_id, title, status,
                    started_at, review_due_at, client_request_id
                ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', datetime('now'), datetime('now', '+6 day'), ?) RETURNING id
                """, Long.class, userId(), subjectType, routineId, userProductId, title, clientRequestId);
        long sessionId = id == null ? 0 : id;
        insertExperienceNotifications(sessionId);
        return sessionId;
    }

    public Optional<ExperienceView> findActiveExperience() {
        return jdbc.query("""
                SELECT * FROM experience_session
                 WHERE user_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1
                """, (rs, rowNum) -> mapExperience(rs), userId()).stream().findFirst();
    }

    public Optional<ExperienceView> findExperience(long id) {
        return jdbc.query("SELECT * FROM experience_session WHERE user_id = ? AND id = ?",
                (rs, rowNum) -> mapExperience(rs), userId(), id).stream().findFirst();
    }

    public void completeExperience(long sessionId, String reason) {
        jdbc.update("""
                UPDATE experience_session SET status = 'COMPLETED', ended_at = datetime('now'), end_reason = ?
                 WHERE id = ? AND user_id = ? AND status = 'ACTIVE'
                """, reason, sessionId, userId());
        jdbc.update("""
                UPDATE notification
                   SET completed_at = COALESCE(completed_at, datetime('now'))
                 WHERE user_id = ? AND experience_id = ? AND cancelled_at IS NULL
                """, userId(), sessionId);
    }

    public void promoteComparisonBaseline(long routineId, long recordId) {
        jdbc.update("UPDATE comparison_baseline SET ended_at = datetime('now') WHERE user_id = ? AND ended_at IS NULL", userId());
        jdbc.update("""
                INSERT INTO comparison_baseline(user_id, routine_id, confirmed_record_id)
                VALUES (?, ?, ?)
                """, userId(), routineId, recordId);
    }

    public Optional<Long> findRecordIdByClientRequest(String clientRequestId) {
        return jdbc.query("SELECT id FROM experience_record WHERE user_id = ? AND client_request_id = ?",
                (rs, rowNum) -> rs.getLong(1), userId(), clientRequestId).stream().findFirst();
    }

    public long insertExperienceRecord(long sessionId, Long userProductId, String sentiment, String note,
                                       String discomfort, String adherence, String clientRequestId, List<String> tags) {
        Long id = jdbc.queryForObject("""
                INSERT INTO experience_record(
                    user_id, session_id, user_product_id, sentiment, note, discomfort, adherence, client_request_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, userId(), sessionId, userProductId, sentiment, note, discomfort, adherence, clientRequestId);
        if (id == null) throw new IllegalStateException("경험 기록 ID를 만들 수 없습니다.");
        for (String tag : tags) {
            if (tag != null && !tag.isBlank()) {
                jdbc.update("INSERT OR IGNORE INTO experience_tag(record_id, label) VALUES (?, ?)", id, tag.trim());
            }
        }
        jdbc.update("""
                UPDATE notification
                   SET completed_at = COALESCE(completed_at, datetime('now'))
                 WHERE user_id = ? AND experience_id = ?
                   AND notification_type = 'EXPERIENCE_CHECK_IN'
                   AND cancelled_at IS NULL
                """, userId(), sessionId);
        return id;
    }

    public List<ExperienceRecordView> findExperienceRecords() {
        return jdbc.query("""
                SELECT er.*,
                       COALESCE(p.name, up.custom_name,
                           (SELECT es.title FROM experience_session es WHERE es.id = er.session_id)) AS product_name
                  FROM experience_record er
                  LEFT JOIN user_product up ON up.id = er.user_product_id
                  LEFT JOIN product p ON p.id = up.product_id
                 WHERE er.user_id = ? ORDER BY er.created_at DESC, er.id DESC
                """, this::mapExperienceRecord, userId());
    }

    public Optional<ExperienceRecordView> findExperienceRecord(long recordId) {
        return jdbc.query("""
                SELECT er.*,
                       COALESCE(p.name, up.custom_name,
                           (SELECT es.title FROM experience_session es WHERE es.id = er.session_id)) AS product_name
                  FROM experience_record er
                  LEFT JOIN user_product up ON up.id = er.user_product_id
                  LEFT JOIN product p ON p.id = up.product_id
                 WHERE er.user_id = ? AND er.id = ?
                """, this::mapExperienceRecord, userId(), recordId).stream().findFirst();
    }

    public Optional<ExperienceRecordView> findLatestRecordForSession(long sessionId) {
        return jdbc.query("""
                SELECT er.*, es.title AS product_name
                  FROM experience_record er JOIN experience_session es ON es.id = er.session_id
                 WHERE er.user_id = ? AND er.session_id = ? ORDER BY er.id DESC LIMIT 1
                """, this::mapExperienceRecord, userId(), sessionId).stream().findFirst();
    }

    public int recordCount() {
        Integer value = jdbc.queryForObject("SELECT COUNT(*) FROM experience_record WHERE user_id = ?", Integer.class, userId());
        return value == null ? 0 : value;
    }

    public int productCount() {
        Integer value = jdbc.queryForObject("SELECT COUNT(*) FROM user_product WHERE user_id = ?", Integer.class, userId());
        return value == null ? 0 : value;
    }

    public List<PatternView> findPatterns() {
        return jdbc.query("""
                SELECT * FROM personal_pattern WHERE user_id = ? AND status = 'ACTIVE' ORDER BY updated_at DESC, id
                """, (rs, rowNum) -> mapPattern(rs), userId());
    }

    public Optional<PatternView> findPattern(long patternId) {
        return jdbc.query("SELECT * FROM personal_pattern WHERE user_id = ? AND id = ? AND status = 'ACTIVE'",
                (rs, rowNum) -> mapPattern(rs), userId(), patternId).stream().findFirst();
    }

    public Long connectRecordToPattern(long recordId, List<String> tags, String sentiment) {
        if (tags.isEmpty() || sentiment.equals("UNSURE")) return null;
        boolean liked = sentiment.equals("LIKED");
        for (String tag : tags) {
            String supportingTitle = patternTitle(tag, liked);
            String contradictingTitle = patternTitle(tag, !liked);
            Long supporting = findPatternIdByTitle(supportingTitle).orElse(null);
            Long contradicting = findPatternIdByTitle(contradictingTitle).orElse(null);

            List<Long> sameDirection = findTaggedRecordIds(tag, sentiment);
            if (supporting == null && sameDirection.size() >= 2) {
                supporting = insertPattern(
                        supportingTitle,
                        "서로 다른 기록에서 ‘" + tag + "’을 선택하고 "
                                + (liked ? "마음에 든다고" : "아쉽다고") + " 남긴 경험이 반복됐어요."
                );
                for (Long evidenceId : sameDirection) connectPatternEvidence(supporting, evidenceId, "SUPPORTS");
                String oppositeSentiment = liked ? "DISAPPOINTED" : "LIKED";
                for (Long evidenceId : findTaggedRecordIds(tag, oppositeSentiment)) {
                    connectPatternEvidence(supporting, evidenceId, "CONTRADICTS");
                }
                insertPatternNotification(supporting);
            } else if (supporting != null) {
                connectPatternEvidence(supporting, recordId, "SUPPORTS");
            }
            if (contradicting != null) connectPatternEvidence(contradicting, recordId, "CONTRADICTS");

            if (supporting != null) refreshPatternConfidence(supporting);
            if (contradicting != null) refreshPatternConfidence(contradicting);
            if (supporting != null) return supporting;
            if (contradicting != null) return contradicting;
        }
        return null;
    }

    private Optional<Long> findPatternIdByTitle(String title) {
        return jdbc.query("SELECT id FROM personal_pattern WHERE user_id = ? AND title = ? AND status = 'ACTIVE'",
                (rs, rowNum) -> rs.getLong(1), userId(), title).stream().findFirst();
    }

    private List<Long> findTaggedRecordIds(String tag, String sentiment) {
        return jdbc.query("""
                SELECT er.id FROM experience_record er
                JOIN experience_tag et ON et.record_id = er.id
                WHERE er.user_id = ? AND et.label = ? AND er.sentiment = ?
                ORDER BY er.created_at, er.id
                """, (rs, rowNum) -> rs.getLong(1), userId(), tag, sentiment);
    }

    private long insertPattern(String title, String summary) {
        Long id = jdbc.queryForObject("""
                INSERT INTO personal_pattern(user_id, title, summary, confidence_note)
                VALUES (?, ?, ?, '지지 0건 · 반대 0건 · 피부 타입 판정이 아님') RETURNING id
                """, Long.class, userId(), title, summary);
        if (id == null) throw new IllegalStateException("패턴 ID를 만들 수 없습니다.");
        return id;
    }

    private void connectPatternEvidence(long patternId, long recordId, String polarity) {
        jdbc.update("""
                INSERT INTO pattern_evidence(pattern_id, record_id, polarity) VALUES (?, ?, ?)
                ON CONFLICT(pattern_id, record_id) DO UPDATE SET polarity = excluded.polarity
                """, patternId, recordId, polarity);
    }

    private void refreshPatternConfidence(long patternId) {
        Map<String, Object> counts = jdbc.queryForMap("""
                SELECT SUM(CASE WHEN polarity = 'SUPPORTS' THEN 1 ELSE 0 END) AS supports,
                       SUM(CASE WHEN polarity = 'CONTRADICTS' THEN 1 ELSE 0 END) AS contradicts
                FROM pattern_evidence WHERE pattern_id = ?
                """, patternId);
        int supports = counts.get("supports") == null ? 0 : ((Number) counts.get("supports")).intValue();
        int contradicts = counts.get("contradicts") == null ? 0 : ((Number) counts.get("contradicts")).intValue();
        jdbc.update("""
                UPDATE personal_pattern
                   SET confidence_note = ?, updated_at = datetime('now')
                 WHERE id = ? AND user_id = ?
                """, "지지 " + supports + "건 · 반대 " + contradicts + "건 · 피부 타입 판정이 아님",
                patternId, userId());
    }

    private static String patternTitle(String tag, boolean liked) {
        return tag + "을 " + (liked ? "좋게" : "아쉽게") + " 느낀 경험이 반복됐어요";
    }

    public long insertConversation(String mode, Long productId, Long experienceId) {
        Long id = jdbc.queryForObject("""
                INSERT INTO conversation(user_id, mode, product_id, experience_id)
                VALUES (?, ?, ?, ?) RETURNING id
                """, Long.class, userId(), mode, productId, experienceId);
        return id == null ? 0 : id;
    }

    public Optional<Map<String, Object>> findConversationRow(long conversationId) {
        return jdbc.queryForList("SELECT * FROM conversation WHERE id = ? AND user_id = ?", conversationId, userId())
                .stream().findFirst();
    }

    public void updateConversationMode(long conversationId, String mode) {
        jdbc.update("""
                UPDATE conversation
                   SET mode = ?, updated_at = datetime('now')
                 WHERE id = ? AND user_id = ?
                """, mode, conversationId, userId());
    }

    public Optional<String> findLatestAssistantClientRequestId(long conversationId) {
        return jdbc.query("""
                SELECT cm.client_request_id
                  FROM conversation_message cm
                  JOIN conversation c ON c.id = cm.conversation_id
                 WHERE cm.conversation_id = ? AND c.user_id = ? AND cm.role = 'ASSISTANT'
                 ORDER BY cm.id DESC LIMIT 1
                """, (rs, rowNum) -> rs.getString(1), conversationId, userId()).stream().findFirst();
    }

    public Optional<Long> findMessageIdByClientRequest(long conversationId, String clientRequestId) {
        return jdbc.query("SELECT id FROM conversation_message WHERE conversation_id = ? AND client_request_id = ?",
                (rs, rowNum) -> rs.getLong(1), conversationId, clientRequestId).stream().findFirst();
    }

    public long insertMessage(long conversationId, String role, String content, String status,
                              String clientRequestId, List<String> suggestedReplies) {
        return insertMessage(conversationId, role, content, status, clientRequestId, suggestedReplies, List.of());
    }

    public long insertMessage(long conversationId, String role, String content, String status,
                              String clientRequestId, List<String> suggestedReplies, List<String> evidenceRefs) {
        return insertMessage(conversationId, role, content, status, clientRequestId,
                suggestedReplies, evidenceRefs, List.of());
    }

    @Transactional
    public long insertMessage(long conversationId, String role, String content, String status,
                              String clientRequestId, List<String> suggestedReplies, List<String> evidenceRefs,
                              List<WebSourceView> webSources) {
        Long id = jdbc.queryForObject("""
                INSERT INTO conversation_message(
                    conversation_id, role, content, status, client_request_id,
                    suggested_replies_json, evidence_refs_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
                """, Long.class, conversationId, role, content, status, clientRequestId,
                writeJson(suggestedReplies == null ? List.of() : suggestedReplies),
                writeJson(evidenceRefs == null ? List.of() : evidenceRefs));
        long messageId = id == null ? 0 : id;
        if (webSources != null) {
            for (int index = 0; index < webSources.size(); index++) {
                WebSourceView source = webSources.get(index);
                jdbc.update("""
                        INSERT INTO conversation_message_source(
                            message_id, source_order, title, url, source_tier
                        ) VALUES (?, ?, ?, ?, ?)
                        """, messageId, index + 1, source.title(), source.url(), source.tier());
            }
        }
        jdbc.update("UPDATE conversation SET updated_at = datetime('now') WHERE id = ?", conversationId);
        return messageId;
    }

    public List<MessageView> findMessages(long conversationId) {
        List<MessageView> messages = jdbc.query("""
                SELECT cm.* FROM conversation_message cm
                JOIN conversation c ON c.id = cm.conversation_id
                WHERE cm.conversation_id = ? AND c.user_id = ? ORDER BY cm.id
                """, (rs, rowNum) -> new MessageView(
                rs.getLong("id"), rs.getString("role"), rs.getString("content"),
                parseStringList(rs.getString("suggested_replies_json")),
                parseStringList(rs.getString("evidence_refs_json")),
                List.of(),
                rs.getString("status"), rs.getString("created_at")
        ), conversationId, userId());
        return messages.stream().map(message -> new MessageView(
                message.id(), message.role(), message.content(), message.suggestedReplies(),
                message.evidenceRefs(), findMessageWebSources(message.id()), message.status(), message.createdAt()
        )).toList();
    }

    private List<WebSourceView> findMessageWebSources(long messageId) {
        return jdbc.query("""
                SELECT source_order, title, url, source_tier
                  FROM conversation_message_source
                 WHERE message_id = ?
                 ORDER BY source_order
                """, (rs, rowNum) -> new WebSourceView(
                "S-" + rs.getInt("source_order"),
                rs.getString("title"), rs.getString("url"), rs.getString("source_tier")
        ), messageId);
    }

    public List<ConversationView> findConversations() {
        return jdbc.query("SELECT id FROM conversation WHERE user_id = ? ORDER BY updated_at DESC",
                (rs, rowNum) -> rs.getLong(1), userId()).stream().map(this::conversationView).toList();
    }

    public ConversationView conversationView(long conversationId) {
        Map<String, Object> row = findConversationRow(conversationId).orElseThrow();
        String mode = String.valueOf(row.get("mode"));
        RescuePlanView plan = findRescuePlan(conversationId).orElse(null);
        List<MessageView> messages = findMessages(conversationId);
        boolean safety = plan != null && "BLOCKED".equals(plan.status());
        List<String> quickReplies = messages.stream()
                .filter(message -> message.role().equals("ASSISTANT") && !message.suggestedReplies().isEmpty())
                .reduce((first, second) -> second)
                .map(MessageView::suggestedReplies)
                .orElseGet(() -> initialQuickReplies(mode));
        return new ConversationView(
                ((Number) row.get("id")).longValue(),
                mode,
                nullableLong(row.get("product_id")),
                nullableLong(row.get("experience_id")),
                String.valueOf(row.get("status")),
                messages,
                quickReplies,
                plan,
                safety
        );
    }

    public Optional<RescuePlanView> findRescuePlan(long conversationId) {
        return jdbc.query("""
                SELECT rp.*, COALESCE(p.name, up.custom_name) AS remove_product_name
                  FROM rescue_plan rp
                  JOIN conversation c ON c.id = rp.conversation_id
                  LEFT JOIN user_product up ON up.id = rp.remove_user_product_id
                  LEFT JOIN product p ON p.id = up.product_id
                 WHERE rp.conversation_id = ? AND c.user_id = ?
                """, (rs, rowNum) -> new RescuePlanView(
                rs.getLong("id"), nullableLong(rs, "base_routine_id"),
                rs.getString("title"), rs.getString("rationale"),
                nullableLong(rs, "remove_user_product_id"), rs.getString("remove_product_name"),
                rs.getString("status"), nullableLong(rs, "applied_experience_id")
        ), conversationId, userId()).stream().findFirst();
    }

    public void upsertRescuePlan(long conversationId, Long baseRoutineId, Long removeUserProductId,
                                 String title, String rationale, String status) {
        jdbc.update("""
                INSERT INTO rescue_plan(conversation_id, base_routine_id, remove_user_product_id, title, rationale, status)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(conversation_id) DO UPDATE SET
                    base_routine_id = excluded.base_routine_id,
                    remove_user_product_id = excluded.remove_user_product_id,
                    title = excluded.title,
                    rationale = excluded.rationale,
                    status = excluded.status
                """, conversationId, baseRoutineId, removeUserProductId, title, rationale, status);
    }

    public void markRescuePlanApplied(long planId, long experienceId) {
        jdbc.update("UPDATE rescue_plan SET status = 'APPLIED', applied_experience_id = ? WHERE id = ?", experienceId, planId);
    }

    public List<ExperienceRecordView> findRelevantRecords(Long productId, int limit) {
        if (productId == null) return findExperienceRecords().stream().limit(limit).toList();
        return jdbc.query("""
                SELECT er.*, COALESCE(p.name, up.custom_name, es.title) AS product_name
                  FROM experience_record er
                  LEFT JOIN user_product up ON up.id = er.user_product_id
                  LEFT JOIN product p ON p.id = up.product_id
                  LEFT JOIN experience_session es ON es.id = er.session_id
                 WHERE er.user_id = ?
                 ORDER BY CASE WHEN p.id = ? OR EXISTS (
                            SELECT 1 FROM experience_session target_es
                            JOIN routine_item target_ri ON target_ri.routine_id = target_es.routine_id
                            JOIN user_product target_up ON target_up.id = target_ri.user_product_id
                            WHERE target_es.id = er.session_id AND target_up.product_id = ?
                          ) THEN 0 ELSE 1 END,
                          er.created_at DESC
                 LIMIT ?
                """, this::mapExperienceRecord, userId(), productId, productId, limit);
    }

    public void deleteDemoUserData() {
        jdbc.update("DELETE FROM app_user WHERE id = ?", userId());
    }

    public void clearExperiencesForEmptyScenario() {
        jdbc.update("DELETE FROM conversation WHERE user_id = ?", userId());
        jdbc.update("DELETE FROM comparison_baseline WHERE user_id = ?", userId());
        jdbc.update("DELETE FROM personal_pattern WHERE user_id = ?", userId());
        jdbc.update("DELETE FROM experience_record WHERE user_id = ?", userId());
        jdbc.update("DELETE FROM experience_session WHERE user_id = ?", userId());
        jdbc.update("DELETE FROM routine WHERE user_id = ?", userId());
        jdbc.update("DELETE FROM notification WHERE user_id = ? AND notification_type <> 'PROFILE_READY'", userId());
    }

    public void clearAllPersonalDataForColdStart() {
        clearExperiencesForEmptyScenario();
        jdbc.update("DELETE FROM user_product WHERE user_id = ?", userId());
    }

    private ProductView mapProduct(ResultSet rs, int rowNum) throws SQLException {
        ProductGuide guide = new ProductGuide(
                rs.getString("guide_summary"),
                rs.getString("guide_routine_step"),
                rs.getString("guide_usage_type"),
                parseStringList(rs.getString("guide_usage_timing_json")),
                parseStringList(rs.getString("guide_usage_tips_json")),
                parseProductHighlights(rs.getString("guide_observation_points_json")),
                rs.getString("guide_origin"),
                rs.getString("guide_generated_at")
        );
        return new ProductView(
                rs.getLong("id"), rs.getString("brand"), rs.getString("brand_logo_url"),
                rs.getString("name"), rs.getString("category"),
                rs.getString("volume"), rs.getString("version_label"), rs.getInt("public_verified") == 1,
                guide, parseSourceFacts(rs.getString("source_facts_json")),
                rs.getInt("personal_record_count"), rs.getInt("owned") == 1, rs.getString("image_url")
        );
    }

    private UserProductView mapUserProduct(ResultSet rs, int rowNum) throws SQLException {
        ProductView product = rs.getObject("id") == null ? null : mapProduct(rs, rowNum);
        return new UserProductView(
                rs.getLong("user_product_id"), product, rs.getString("custom_brand"),
                rs.getString("user_product_brand_logo_url"), rs.getString("custom_name"),
                rs.getString("custom_category"), rs.getString("memo"),
                rs.getString("added_at"), rs.getInt("personal_record_count"),
                rs.getInt("in_current_routine") == 1
        );
    }

    public NotificationInboxView findNotificationInbox() {
        List<NotificationView> items = jdbc.query("""
                SELECT * FROM notification
                 WHERE user_id = ? AND cancelled_at IS NULL
                   AND datetime(available_at) <= datetime('now')
                   AND (snoozed_until IS NULL OR datetime(snoozed_until) <= datetime('now'))
                 ORDER BY datetime(available_at) DESC, id DESC
                 LIMIT 50
                """, this::mapNotification, userId());
        Integer unread = jdbc.queryForObject("""
                SELECT COUNT(*) FROM notification
                 WHERE user_id = ? AND cancelled_at IS NULL AND completed_at IS NULL AND read_at IS NULL
                   AND datetime(available_at) <= datetime('now')
                   AND (snoozed_until IS NULL OR datetime(snoozed_until) <= datetime('now'))
                """, Integer.class, userId());
        return new NotificationInboxView(items, unread == null ? 0 : unread);
    }

    public Optional<NotificationView> findNotification(long notificationId) {
        return jdbc.query("SELECT * FROM notification WHERE id = ? AND user_id = ?",
                this::mapNotification, notificationId, userId()).stream().findFirst();
    }

    public NotificationView markNotificationRead(long notificationId) {
        int updated = jdbc.update("""
                UPDATE notification SET read_at = COALESCE(read_at, datetime('now'))
                 WHERE id = ? AND user_id = ? AND cancelled_at IS NULL
                """, notificationId, userId());
        if (updated == 0) throw ApiException.notFound("알림을 찾을 수 없어요.");
        return findNotification(notificationId).orElseThrow();
    }

    public NotificationView snoozeNotification(long notificationId, int durationHours) {
        int updated = jdbc.update("""
                UPDATE notification SET snoozed_until = datetime('now', ?)
                 WHERE id = ? AND user_id = ? AND completed_at IS NULL AND cancelled_at IS NULL
                """, "+" + durationHours + " hours", notificationId, userId());
        if (updated == 0) throw ApiException.notFound("미룰 수 있는 알림을 찾을 수 없어요.");
        return findNotification(notificationId).orElseThrow();
    }

    public void markAllNotificationsRead() {
        jdbc.update("""
                UPDATE notification SET read_at = COALESCE(read_at, datetime('now'))
                 WHERE user_id = ? AND cancelled_at IS NULL
                   AND datetime(available_at) <= datetime('now')
                   AND (snoozed_until IS NULL OR datetime(snoozed_until) <= datetime('now'))
                """, userId());
    }

    public void insertProfileReadyNotification() {
        jdbc.update("""
                INSERT OR IGNORE INTO notification(
                    user_id, notification_type, title, body, available_at, dedupe_key
                ) VALUES (?, 'PROFILE_READY', '첫 피부 프로필이 생성되었어요',
                          '온보딩에서 직접 고른 스킨케어 맥락을 확인해보세요.',
                          datetime('now'), 'profile-ready')
                """, userId());
    }

    public void insertProfileUpdatedNotification() {
        jdbc.update("""
                INSERT OR IGNORE INTO notification(
                    user_id, notification_type, title, body, available_at, dedupe_key
                ) VALUES (?, 'PROFILE_UPDATED', '스킨케어 프로필이 업데이트되었어요',
                          '직접 수정한 내용이 다음 탐색 맥락에 반영됐어요.',
                          datetime('now'), 'profile-updated:' || strftime('%Y-%m-%dT%H:%M:%S', 'now'))
                """, userId());
    }

    private void insertExperienceNotifications(long sessionId) {
        jdbc.update("""
                INSERT OR IGNORE INTO notification(
                    user_id, notification_type, experience_id, title, body, available_at, dedupe_key
                )
                SELECT user_id, 'EXPERIENCE_CHECK_IN', id,
                       'DAY 2, 오늘은 어땠나요?',
                       '작은 변화라도 괜찮아요. 느낀 점을 남겨보세요.',
                       datetime(started_at, '+1 day'), 'experience-check-in:' || id
                  FROM experience_session WHERE id = ? AND user_id = ?
                """, sessionId, userId());
        jdbc.update("""
                INSERT OR IGNORE INTO notification(
                    user_id, notification_type, experience_id, title, body, available_at, dedupe_key
                )
                SELECT user_id, 'EXPERIENCE_REVIEW_DUE', id,
                       '7일 경험을 돌아볼 시간이에요',
                       title || '에서 느낀 점을 남겨보세요.',
                       review_due_at, 'experience-review:' || id
                  FROM experience_session WHERE id = ? AND user_id = ?
                """, sessionId, userId());
    }

    private void insertPatternNotification(long patternId) {
        jdbc.update("""
                INSERT OR IGNORE INTO notification(
                    user_id, notification_type, pattern_id, title, body, available_at, dedupe_key
                )
                SELECT user_id, 'PATTERN_READY', id, '새로운 취향 패턴을 발견했어요',
                       '최근 기록을 바탕으로 근거와 반대 기록을 함께 연결했어요.',
                       datetime('now'), 'pattern-ready:' || id
                  FROM personal_pattern WHERE id = ? AND user_id = ?
                """, patternId, userId());
    }

    private NotificationView mapNotification(ResultSet rs, int rowNum) throws SQLException {
        String type = rs.getString("notification_type");
        Long experienceId = nullableLong(rs, "experience_id");
        Long patternId = nullableLong(rs, "pattern_id");
        String completedAt = rs.getString("completed_at");
        NotificationActionView action;
        if (type.startsWith("EXPERIENCE_") && experienceId != null) {
            action = completedAt == null
                    ? new NotificationActionView("RECORD_EXPERIENCE", "느낌 남기기", "/experiences/" + experienceId + "/record")
                    : new NotificationActionView("RECORDS", "남긴 기록 보기", "/records");
        } else if (type.equals("PATTERN_READY") && patternId != null) {
            action = new NotificationActionView("PATTERN", "패턴 보기", "/patterns/" + patternId);
        } else if (type.startsWith("PROFILE_")) {
            action = new NotificationActionView("PROFILE", "프로필 보기", "/records");
        } else {
            action = new NotificationActionView("EXPLORE", "제품 탐색하기", "/explore");
        }
        String readAt = rs.getString("read_at");
        return new NotificationView(
                rs.getLong("id"), type, rs.getString("title"), rs.getString("body"),
                rs.getString("created_at"), rs.getString("available_at"), readAt,
                rs.getString("snoozed_until"), completedAt,
                readAt != null, completedAt != null, action
        );
    }

    private RoutineView mapRoutine(ResultSet rs) throws SQLException {
        long routineId = rs.getLong("id");
        List<RoutineItemView> items = jdbc.query("""
                SELECT ri.user_product_id, ri.time_slot, ri.position, ri.frequency,
                       COALESCE(p.name, up.custom_name) AS product_name,
                       COALESCE(p.brand, up.custom_brand, '') AS brand,
                       ba.logo_url AS brand_logo_url,
                       COALESCE(p.category, up.custom_category, '기타') AS category
                  FROM routine_item ri
                  JOIN user_product up ON up.id = ri.user_product_id
                  LEFT JOIN product p ON p.id = up.product_id
                  LEFT JOIN brand_asset ba ON ba.brand = COALESCE(p.brand, up.custom_brand)
                 WHERE ri.routine_id = ?
                 ORDER BY ri.position
                """, (itemRs, rowNum) -> new RoutineItemView(
                itemRs.getLong("user_product_id"), itemRs.getString("product_name"),
                itemRs.getString("brand"), itemRs.getString("brand_logo_url"),
                itemRs.getString("category"),
                itemRs.getString("time_slot"),
                itemRs.getInt("position"), itemRs.getString("frequency")
        ), routineId);
        return new RoutineView(routineId, rs.getString("name"), rs.getString("day_part"),
                rs.getString("status"), rs.getString("started_at"), items);
    }

    private ExperienceView mapExperience(ResultSet rs) throws SQLException {
        long id = rs.getLong("id");
        String subjectType = rs.getString("subject_type");
        Long routineId = nullableLong(rs, "routine_id");
        Long userProductId = nullableLong(rs, "user_product_id");
        RoutineView routine = routineId == null ? null : findRoutine(routineId).orElse(null);
        UserProductView product = userProductId == null ? null : findUserProduct(userProductId).orElse(null);
        String startedAt = rs.getString("started_at");
        String reviewDueAt = rs.getString("review_due_at");
        int day = Math.max(1, daysBetween(startedAt, nowSql()) + 1);
        int untilReview = daysBetween(nowSql(), reviewDueAt);
        String subtitle = subjectType.equals("ROUTINE") && routine != null
                ? routine.items().stream().map(RoutineItemView::productName).limit(2).reduce((a, b) -> a + " · " + b).orElse("")
                    + (routine.items().size() > 2 ? " 외 " + (routine.items().size() - 2) + "개" : "")
                : product == null ? "제품 경험" : product.displayName();
        return new ExperienceView(
                id, subjectType, routineId, userProductId, rs.getString("title"), subtitle,
                rs.getString("status"), startedAt, reviewDueAt, day, Math.max(0, untilReview),
                untilReview <= 0, routine, product, findLatestRecordForSession(id).orElse(null)
        );
    }

    private ExperienceRecordView mapExperienceRecord(ResultSet rs, int rowNum) throws SQLException {
        long id = rs.getLong("id");
        List<String> tags = jdbc.query("SELECT label FROM experience_tag WHERE record_id = ? ORDER BY label",
                (tagRs, tagRow) -> tagRs.getString(1), id);
        return new ExperienceRecordView(
                id, nullableLong(rs, "session_id"), nullableLong(rs, "user_product_id"),
                rs.getString("product_name"), rs.getString("sentiment"), rs.getString("note"),
                rs.getString("discomfort"), rs.getString("adherence"), tags, rs.getString("created_at")
        );
    }

    private PatternView mapPattern(ResultSet rs) throws SQLException {
        long id = rs.getLong("id");
        List<PatternEvidenceView> evidence = jdbc.query("""
                SELECT pe.polarity, er.id AS record_id, er.note, er.sentiment, er.created_at,
                       COALESCE(p.name, up.custom_name, es.title) AS product_name
                  FROM pattern_evidence pe
                  JOIN experience_record er ON er.id = pe.record_id
                  LEFT JOIN user_product up ON up.id = er.user_product_id
                  LEFT JOIN product p ON p.id = up.product_id
                  LEFT JOIN experience_session es ON es.id = er.session_id
                 WHERE pe.pattern_id = ? ORDER BY er.created_at DESC
                """, (evidenceRs, rowNum) -> new PatternEvidenceView(
                evidenceRs.getLong("record_id"), evidenceRs.getString("product_name"),
                evidenceRs.getString("note"), evidenceRs.getString("sentiment"),
                evidenceRs.getString("polarity"), evidenceRs.getString("created_at")
        ), id);
        int supports = (int) evidence.stream().filter(item -> item.polarity().equals("SUPPORTS")).count();
        int contradicts = evidence.size() - supports;
        return new PatternView(id, rs.getString("title"), rs.getString("summary"),
                rs.getString("confidence_note"), supports, contradicts, evidence);
    }

    private List<String> parseStringList(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<ProductHighlight> parseProductHighlights(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<ProductFact> parseSourceFacts(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private static Long nullableLong(ResultSet rs, String column) throws SQLException {
        long value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private static Long nullableLong(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static int daysBetween(String from, String to) {
        try {
            LocalDateTime start = LocalDateTime.parse(from.replace(' ', 'T'));
            LocalDateTime end = LocalDateTime.parse(to.replace(' ', 'T'));
            return (int) ChronoUnit.DAYS.between(start.toLocalDate(), end.toLocalDate());
        } catch (Exception ignored) {
            return 0;
        }
    }

    private static String nowSql() {
        return LocalDateTime.now(SEOUL).withNano(0).toString().replace('T', ' ');
    }

    private static List<String> initialQuickReplies(String mode) {
        if ("RESCUE".equals(mode)) return List.of("심하거나 빠르게 악화되진 않아요", "잘 모르겠어요", "빠르게 심해지고 있어요");
        if ("PRODUCT".equals(mode)) return List.of("현재 루틴과 겹쳐?", "비슷한 내 기록 보여줘", "써보면 뭘 기록할까?");
        if ("RECOMMEND".equals(mode)) return List.of("1번 후보를 자세히 볼래", "후보들의 차이는 뭐야?", "내 기록이 부족한 부분은?");
        if ("PATTERN".equals(mode)) return List.of("반대 기록도 보여줘", "다음 제품에 어떻게 써?", "이 패턴 숨기기");
        return List.of("내 최근 기록 요약해줘", "다음에 볼 제품 기준은?", "불편했던 경험 찾기");
    }

    private String writeJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (Exception ignored) {
            return "[]";
        }
    }

    private long userId() {
        return currentUser.id();
    }
}
