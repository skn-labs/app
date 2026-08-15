package app.skn.auth;

import app.skn.api.ApiModels.AuthView;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.List;
import java.util.Optional;

import app.skn.api.ApiModels.PreferenceView;
import app.skn.api.ApiModels.QuickAccountView;

@Repository
public class AuthRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public AuthRepository(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public Optional<Map<String, Object>> findCredentials(String username) {
        return jdbc.queryForList("""
                SELECT id, username, password_hash, display_name, is_demo
                  FROM app_user WHERE username = ? COLLATE NOCASE
                """, username).stream().findFirst();
    }

    public Optional<AuthView> findUser(long userId) {
        return jdbc.query("""
                SELECT u.id, u.username, u.display_name, u.is_demo,
                       CASE WHEN o.completed_at IS NULL THEN 0 ELSE 1 END AS onboarding_completed
                  FROM app_user u
                  LEFT JOIN user_onboarding o ON o.user_id = u.id
                 WHERE u.id = ?
                """, (rs, rowNum) -> new AuthView(
                rs.getLong("id"), rs.getString("username"), rs.getString("display_name"),
                rs.getInt("is_demo") == 1,
                rs.getInt("onboarding_completed") == 1
        ), userId).stream().findFirst();
    }

    public List<QuickAccountView> findQuickAccounts() {
        return jdbc.query("""
                SELECT username, display_name
                  FROM app_user
                 WHERE is_demo = 0
                 ORDER BY CASE WHEN username GLOB 'test[0-9][0-9]' THEN 0 ELSE 1 END,
                          id
                """, (rs, rowNum) -> new QuickAccountView(
                rs.getString("username"), rs.getString("display_name")
        ));
    }

    public long insert(String username, String passwordHash, String displayName) {
        Long id = jdbc.queryForObject("""
                INSERT INTO app_user(username, password_hash, display_name, is_demo)
                VALUES (?, ?, ?, 0) RETURNING id
                """, Long.class, username, passwordHash, displayName);
        if (id == null) throw new IllegalStateException("회원 ID를 만들 수 없습니다.");
        return id;
    }

    public void completeOnboarding(long userId, String entryChoice, int selectedProductCount) {
        jdbc.update("""
                INSERT INTO user_onboarding(user_id, entry_choice, selected_product_count, completed_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    entry_choice = excluded.entry_choice,
                    selected_product_count = excluded.selected_product_count,
                    completed_at = excluded.completed_at
                """, userId, entryChoice, selectedProductCount);
    }

    /** ONB-01. 비어 있는 선호도 정상이며, 그때는 빈 목록으로 저장한다. */
    public void savePreference(long userId, List<String> likes, List<String> avoids, String note) {
        jdbc.update("""
                INSERT INTO user_preference(user_id, texture_likes_json, texture_avoids_json, note, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    texture_likes_json = excluded.texture_likes_json,
                    texture_avoids_json = excluded.texture_avoids_json,
                    note = excluded.note,
                    updated_at = excluded.updated_at
                """, userId, writeList(likes), writeList(avoids), note == null ? "" : note);
    }

    public PreferenceView findPreference(long userId) {
        List<PreferenceView> rows = jdbc.query("""
                SELECT texture_likes_json, texture_avoids_json, note
                  FROM user_preference
                 WHERE user_id = ?
                """, (rs, index) -> new PreferenceView(
                        readList(rs.getString("texture_likes_json")),
                        readList(rs.getString("texture_avoids_json")),
                        rs.getString("note")), userId);
        return rows.isEmpty() ? new PreferenceView(List.of(), List.of(), "") : rows.get(0);
    }

    private String writeList(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values == null ? List.of() : values);
        } catch (Exception ignored) {
            return "[]";
        }
    }

    private List<String> readList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception ignored) {
            return List.of();
        }
    }

    public void delete(long userId) {
        jdbc.update("DELETE FROM app_user WHERE id = ?", userId);
    }
}
