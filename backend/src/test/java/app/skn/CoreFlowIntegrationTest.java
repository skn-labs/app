package app.skn;

import app.skn.auth.AccessTokenService;
import app.skn.data.SchemaScript;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.servlet.http.Cookie;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import javax.sql.DataSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CoreFlowIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired DataSource dataSource;

    @Test
    void unauthenticatedPersonalDataIsRejected() throws Exception {
        mvc.perform(get("/api/v1/home"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
    }

    @Test
    void demoShowsConnectedExperience() throws Exception {
        Cookie session = demoToken();
        mvc.perform(get("/api/v1/home").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("코덕님"))
                .andExpect(jsonPath("$.currentExperience.status").value("ACTIVE"))
                .andExpect(jsonPath("$.patterns[0].evidence").isArray());
    }

    @Test
    void activeRoutineExperienceReturnsAccumulatedRecordSummary() throws Exception {
        Cookie session = signUpToken("record_summary_user");
        long userProductId = addProduct(session, 1);
        String experienceBody = mvc.perform(post("/api/v1/me/experiences").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userProductId":%d,"mode":"ROUTINE","dayPart":"EVENING","clientRequestId":"summary-session"}
                                """.formatted(userProductId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long experienceId = json.readTree(experienceBody).path("id").asLong();

        mvc.perform(post("/api/v1/me/experiences/{id}/records", experienceId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sentiment":"LIKED","note":"아침에는 편했어요","tags":[],"discomfort":"NOT_REPORTED","clientRequestId":"summary-record-1"}
                                """))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/me/experiences/{id}/records", experienceId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sentiment":"DISAPPOINTED","note":"저녁에는 답답했어요","tags":["답답함"],"discomfort":"REPORTED","clientRequestId":"summary-record-2"}
                                """))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/me/experiences/{id}/records", experienceId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sentiment":"LIKED","note":"다음 날은 괜찮았어요","tags":[],"discomfort":"UNKNOWN","clientRequestId":"summary-record-3"}
                                """))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/home").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentExperience.recordSummary.totalCount").value(3))
                .andExpect(jsonPath("$.currentExperience.recordSummary.likedCount").value(2))
                .andExpect(jsonPath("$.currentExperience.recordSummary.disappointedCount").value(1))
                .andExpect(jsonPath("$.currentExperience.recordSummary.unsureCount").value(0))
                .andExpect(jsonPath("$.currentExperience.recordSummary.discomfortCount").value(1));
    }

    @Test
    @Transactional
    void productCatalogUsesStableCursorPages() throws Exception {
        insertCatalogProduct(1722, "라운드랩", "자작나무 수분 선크림", "선크림");
        insertCatalogProduct(409, "토리든", "다이브인 저분자 히알루론산 세럼", "세럼");
        insertCatalogProduct(829, "에스트라", "아토베리어365 크림", "수분크림");

        Cookie session = demoToken();
        String firstBody = mvc.perform(get("/api/v1/products").cookie(session).param("limit", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.items[0].brand").value("라운드랩"))
                .andExpect(jsonPath("$.items[1].brand").value("토리든"))
                .andExpect(jsonPath("$.items[2].brand").value("에스트라"))
                .andExpect(jsonPath("$.hasMore").value(true))
                .andExpect(jsonPath("$.nextCursor").isString())
                .andReturn().getResponse().getContentAsString();
        JsonNode first = json.readTree(firstBody);

        String secondBody = mvc.perform(get("/api/v1/products").cookie(session)
                        .param("limit", "3")
                        .param("cursor", first.path("nextCursor").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(3))
                .andReturn().getResponse().getContentAsString();
        JsonNode second = json.readTree(secondBody);

        var firstIds = new java.util.ArrayList<Long>();
        var secondIds = new java.util.ArrayList<Long>();
        first.path("items").forEach(item -> firstIds.add(item.path("id").asLong()));
        second.path("items").forEach(item -> secondIds.add(item.path("id").asLong()));
        assertThat(firstIds).doesNotContainAnyElementsOf(secondIds);
        mvc.perform(get("/api/v1/products").cookie(session).param("cursor", "broken"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INVALID_PRODUCT_CURSOR"));
    }

    @Test
    @Transactional
    void productCatalogOrdersEqualSearchMatchesByAchievementCount() throws Exception {
        insertCatalogProduct(3001, "테스트브랜드", "성과정렬 제품 A", "세럼");
        insertCatalogProduct(3002, "테스트브랜드", "성과정렬 제품 B", "세럼");
        jdbc.update("""
                INSERT INTO product_achievement(
                    product_id, achievement_type, period_label, title, detail,
                    source_label, source_url, checked_at, display_order
                ) VALUES
                    (3001, 'RANKING', '2025', '테스트 어워드 2위', '세럼 부문',
                     '테스트 주관사', 'https://example.com/awards/a', '2026-08-17T00:00:00Z', 10),
                    (3002, 'RANKING', '2026 상반기', '테스트 어워드 1위', '세럼 부문',
                     '테스트 주관사', 'https://example.com/awards/b', '2026-08-17T00:00:00Z', 1),
                    (3002, 'AWARD', '2025', '테스트 에디터 선정', '세럼 부문',
                     '테스트 주관사', 'https://example.com/awards/c', '2026-08-17T00:00:00Z', 10)
                """);

        mvc.perform(get("/api/v1/products").cookie(demoToken())
                        .param("query", "성과정렬").param("limit", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(3002))
                .andExpect(jsonPath("$.items[1].id").value(3001));
    }

    @Test
    @Transactional
    void productCatalogSpacesRepeatedAchievementEventsWithoutLosingCountPriority() throws Exception {
        insertCatalogProduct(3011, "테스트브랜드", "성과분산 제품 A", "세럼");
        insertCatalogProduct(3012, "테스트브랜드", "성과분산 제품 B", "세럼");
        insertCatalogProduct(3013, "테스트브랜드", "성과분산 제품 C", "세럼");
        jdbc.update("""
                WITH RECURSIVE achievement_number(value) AS (
                    VALUES (1) UNION ALL SELECT value + 1 FROM achievement_number WHERE value < 6
                )
                INSERT INTO product_achievement(
                    product_id, achievement_type, period_label, title, detail,
                    source_label, source_url, checked_at, display_order
                )
                SELECT 3011, 'AWARD', '2026', '분산 A ' || value, '세럼 부문',
                       '테스트 주관사', 'https://example.com/awards/shared', '2026-08-17T00:00:00Z', value
                  FROM achievement_number
                """);
        jdbc.update("""
                WITH RECURSIVE achievement_number(value) AS (
                    VALUES (1) UNION ALL SELECT value + 1 FROM achievement_number WHERE value < 5
                )
                INSERT INTO product_achievement(
                    product_id, achievement_type, period_label, title, detail,
                    source_label, source_url, checked_at, display_order
                )
                SELECT 3012, 'AWARD', '2026', '분산 B ' || value, '세럼 부문',
                       '테스트 주관사', 'https://example.com/awards/shared', '2026-08-17T00:00:00Z', value
                  FROM achievement_number
                """);
        jdbc.update("""
                WITH RECURSIVE achievement_number(value) AS (
                    VALUES (1) UNION ALL SELECT value + 1 FROM achievement_number WHERE value < 3
                )
                INSERT INTO product_achievement(
                    product_id, achievement_type, period_label, title, detail,
                    source_label, source_url, checked_at, display_order
                )
                SELECT 3013, 'AWARD', '2025', '분산 C ' || value, '세럼 부문',
                       '다른 테스트 주관사', 'https://example.com/awards/other', '2026-08-17T00:00:00Z', value
                  FROM achievement_number
                """);

        mvc.perform(get("/api/v1/products").cookie(demoToken())
                        .param("query", "성과분산").param("limit", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(3011))
                .andExpect(jsonPath("$.items[1].id").value(3013))
                .andExpect(jsonPath("$.items[2].id").value(3012));
    }

    @Test
    void userProductsAreReturnedNewestFirst() throws Exception {
        String body = mvc.perform(get("/api/v1/me/products").cookie(demoToken()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode items = json.readTree(body);

        for (int index = 1; index < items.size(); index++) {
            JsonNode previous = items.get(index - 1);
            JsonNode current = items.get(index);
            int addedAtOrder = previous.path("addedAt").asText().compareTo(current.path("addedAt").asText());
            assertThat(addedAtOrder).isGreaterThanOrEqualTo(0);
            if (addedAtOrder == 0) {
                assertThat(previous.path("id").asLong()).isGreaterThan(current.path("id").asLong());
            }
        }
    }

    @Test
    void everyCatalogProductHasAProductGuideAndLegacyFactsAreNotExposed() throws Exception {
        Integer productCount = jdbc.queryForObject("SELECT COUNT(*) FROM product", Integer.class);
        Integer guideCount = jdbc.queryForObject("SELECT COUNT(*) FROM product_catalog_content", Integer.class);
        assertThat(guideCount).isEqualTo(productCount);

        mvc.perform(get("/api/v1/products/2").cookie(demoToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.guide.summary").value("판테놀을 중심으로 편안한 사용감을 내세운 세럼 제품이에요."))
                .andExpect(jsonPath("$.guide.routineStep").value("토너 다음 단계"))
                .andExpect(jsonPath("$.guide.usageTiming").isArray())
                .andExpect(jsonPath("$.guide.usageInstructions.length()").value(2))
                .andExpect(jsonPath("$.guide.highlights.length()").value(3))
                .andExpect(jsonPath("$.guide.highlights[0].title").value("제형"))
                .andExpect(jsonPath("$.guide.highlights[0].detail").value("젤 세럼 타입이에요."))
                .andExpect(jsonPath("$.guide.usageTips").doesNotExist())
                .andExpect(jsonPath("$.guide.observationPoints").doesNotExist())
                .andExpect(jsonPath("$.guide.origin").value("EDITORIAL"))
                .andExpect(jsonPath("$.verified").value(false))
                .andExpect(jsonPath("$.facts").isEmpty())
                .andExpect(jsonPath("$.achievements").isEmpty());

        Integer oldEditorialCopy = jdbc.queryForObject("""
                SELECT COUNT(*) FROM product_catalog_content
                 WHERE origin = 'EDITORIAL'
                   AND (summary LIKE '%기록%' OR summary LIKE '%비교%' OR summary LIKE '%느낌%')
                """, Integer.class);
        assertThat(oldEditorialCopy).isZero();
    }

    @Test
    void embeddedFrontendOriginCanUseQuickLogin() throws Exception {
        mvc.perform(post("/api/v1/auth/quick-login/test01")
                        .header(HttpHeaders.ORIGIN, "https://app.huddlekit.com")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(header().string(
                        HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN,
                        "https://app.huddlekit.com"
                ))
                .andExpect(jsonPath("$.username").value("test01"));
    }

    @Test
    void embeddedFrontendOriginCanCompleteCorsPreflight() throws Exception {
        mvc.perform(options("/api/v1/auth/quick-login/test01")
                        .header(HttpHeaders.ORIGIN, "https://app.huddlekit.com")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string(
                        HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN,
                        "https://app.huddlekit.com"
                ));
    }

    @Test
    void legacyAiGeneratedGuideIsReplacedBeforeNewGenerationRuns() {
        jdbc.update("""
                UPDATE product_catalog_content
                   SET summary = '느낌을 기록하고 다른 제품과 비교해보세요.',
                       usage_tips_json = '["사용 뒤 느낌을 기록해요."]',
                       observation_points_json = '[{"title":"관찰","detail":"변화를 기록해요."}]',
                       origin = 'AI_GENERATED'
                 WHERE product_id = 6
                """);

        SchemaScript.reapply(dataSource);

        var guide = jdbc.queryForMap("""
                SELECT summary, usage_tips_json, observation_points_json, origin
                  FROM product_catalog_content
                 WHERE product_id = 6
                """);
        assertThat(guide.get("summary")).isEqualTo("아침과 저녁에 사용하는 젤 클렌저 제품이에요.");
        assertThat(guide.get("usage_tips_json").toString()).doesNotContain("기록", "비교", "느낌");
        assertThat(guide.get("observation_points_json").toString()).doesNotContain("기록", "비교", "느낌");
        assertThat(guide.get("origin")).isEqualTo("EDITORIAL");
    }

    @Test
    void onlySourceBackedFactsAreReturnedAsFactObjects() throws Exception {
        jdbc.update("""
                INSERT OR IGNORE INTO product_source_fact(
                    product_id, fact_type, fact_text, source_label, source_url, checked_at
                ) VALUES (11, 'DIRECTIONS', '공식 페이지에 아침과 저녁 사용으로 안내되어 있어요.',
                          '브랜드 공식 페이지', 'https://example.com/products/11', '2026-08-11T00:00:00Z')
                """);

        mvc.perform(get("/api/v1/products/11").cookie(demoToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.facts.length()").value(1))
                .andExpect(jsonPath("$.facts[0].type").value("DIRECTIONS"))
                .andExpect(jsonPath("$.facts[0].text").isNotEmpty())
                .andExpect(jsonPath("$.facts[0].sourceLabel").value("브랜드 공식 페이지"))
                .andExpect(jsonPath("$.facts[0].sourceUrl").value("https://example.com/products/11"))
                .andExpect(jsonPath("$.facts[0].checkedAt").value("2026-08-11T00:00:00Z"))
                .andExpect(jsonPath("$.verified").value(true));
    }

    @Test
    @Transactional
    void datedProductAchievementIsReturnedSeparatelyFromProductFacts() throws Exception {
        jdbc.update("""
                INSERT OR IGNORE INTO product_achievement(
                    product_id, achievement_type, period_label, title, detail,
                    source_label, source_url, checked_at, display_order
                ) VALUES (11, 'AWARD', '2025', '테스트 뷰티 어워드', '토너 부문',
                          '테스트 주관사', 'https://example.com/awards/2025',
                          '2026-08-17T00:00:00Z', 10)
                """);

        mvc.perform(get("/api/v1/products/11").cookie(demoToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.achievements.length()").value(1))
                .andExpect(jsonPath("$.achievements[0].type").value("AWARD"))
                .andExpect(jsonPath("$.achievements[0].periodLabel").value("2025"))
                .andExpect(jsonPath("$.achievements[0].title").value("테스트 뷰티 어워드"))
                .andExpect(jsonPath("$.achievements[0].sourceLabel").value("테스트 주관사"))
                .andExpect(jsonPath("$.achievements[0].checkedAt").value("2026-08-17T00:00:00Z"));
    }

    @Test
    void newAccountIsEmptyAndCannotReadDemoProducts() throws Exception {
        Cookie session = signUpToken("empty_user");
        mvc.perform(get("/api/v1/auth/me").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingCompleted").value(false));
        mvc.perform(get("/api/v1/home").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productCount").value(0))
                .andExpect(jsonPath("$.recordCount").value(0));
        mvc.perform(get("/api/v1/me/products/1").cookie(session))
                .andExpect(status().isNotFound());
    }

    @Test
    void onboardingStoresPrototypeTwoProfileAndMarksAccountComplete() throws Exception {
        Cookie session = signUpToken("onboarding_user");
        String request = """
                {"profile":{"ageRange":"20S","gender":"FEMALE","skinType":"UNSURE",
                  "skinCondition":3,"concerns":["건조함","민감함"],
                  "textures":["가벼운","촉촉한"],"avoids":["향료"],
                  "avoidNote":"에센셜 오일은 피하고 싶어요",
                  "trialFrequency":"EVERY_FEW_MONTHS"},
                 "clientRequestId":"prototype-two-onboarding"}
                """;

        mvc.perform(post("/api/v1/auth/onboarding").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.onboardingCompleted").value(true))
                .andExpect(jsonPath("$.profile.ageRange").value("20S"))
                .andExpect(jsonPath("$.profile.skinCondition").value(3))
                .andExpect(jsonPath("$.profile.concerns.length()").value(2));

        mvc.perform(get("/api/v1/me/skin-profile").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gender").value("FEMALE"))
                .andExpect(jsonPath("$.trialFrequency").value("EVERY_FEW_MONTHS"));

        mvc.perform(get("/api/v1/me/preferences").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likes[0]").value("가벼운"))
                .andExpect(jsonPath("$.avoids[0]").value("향료"))
                .andExpect(jsonPath("$.note").value("에센셜 오일은 피하고 싶어요"));

        mvc.perform(get("/api/v1/me/notifications").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1))
                .andExpect(jsonPath("$.items[0].type").value("PROFILE_READY"));
    }

    @Test
    void onboardingRejectsIncompletePrototypeTwoProfile() throws Exception {
        Cookie session = signUpToken("profile_limits_user");
        String request = """
                {"profile":{"ageRange":"20S","gender":"FEMALE","skinType":"UNSURE",
                  "skinCondition":7,"concerns":[],"textures":[],"avoids":[],
                  "avoidNote":"","trialFrequency":"EVERY_FEW_MONTHS"},
                 "clientRequestId":"profile-limits"}
                """;

        mvc.perform(post("/api/v1/auth/onboarding").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.fieldErrors['profile.skinCondition']").exists())
                .andExpect(jsonPath("$.fieldErrors['profile.concerns']").exists())
                .andExpect(jsonPath("$.fieldErrors['profile.textures']").exists());
    }

    @Test
    void skinProfileCanBeReplacedByItsOwner() throws Exception {
        Cookie session = signUpToken("profile_edit_user");
        mvc.perform(put("/api/v1/me/skin-profile").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"ageRange":"30S","gender":"MALE","skinType":"DRY",
                                 "skinCondition":2,"concerns":["당김"],"textures":["촉촉한"],
                                 "avoids":[],"avoidNote":"","trialFrequency":"RARELY"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ageRange").value("30S"))
                .andExpect(jsonPath("$.skinType").value("DRY"));
        mvc.perform(get("/api/v1/me/notifications").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].type").value("PROFILE_UPDATED"))
                .andExpect(jsonPath("$.items[0].action.type").value("PROFILE"));
    }

    @Test
    void preferencesArePrivateToTheirOwner() throws Exception {
        Cookie owner = signUpToken("pref_owner");
        mvc.perform(put("/api/v1/me/preferences").cookie(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"likes":["촉촉한"],"avoids":[],"note":""}
                                """))
                .andExpect(status().isOk());

        Cookie other = signUpToken("pref_other");
        mvc.perform(get("/api/v1/me/preferences").cookie(other))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.likes.length()").value(0));

        mvc.perform(get("/api/v1/me/preferences"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void conversationsArePrivateToTheirOwner() throws Exception {
        Cookie demo = demoToken();
        String body = mvc.perform(post("/api/v1/ai/conversations").cookie(demo)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"GENERAL","initialPrompt":"내 기록을 요약해줘","clientRequestId":"test-private-conversation"}
                                """))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long conversationId = json.readTree(body).path("id").asLong();
        Cookie other = signUpToken("private_user");
        mvc.perform(get("/api/v1/ai/conversations/{id}", conversationId).cookie(other))
                .andExpect(status().isNotFound());
    }

    @Test
    void usernameAndPasswordCanBeUsedToSignUpAndLogIn() throws Exception {
        Cookie signUp = signUpToken("login_user");
        mvc.perform(post("/api/v1/auth/logout").cookie(signUp)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE,
                        org.hamcrest.Matchers.containsString("Max-Age=0")));

        mvc.perform(get("/api/v1/auth/me").cookie(signUp))
                .andExpect(status().isUnauthorized());

        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"login_user\",\"password\":\"passw0rd!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("login_user"))
                .andExpect(jsonPath("$.demo").value(false));

        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"login_user\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void accessTokenIsOpaqueHttpOnlyAndExpiresAfterThirtyDays() throws Exception {
        var result = mvc.perform(post("/api/v1/auth/signup")
                        .header("X-Forwarded-Proto", "https")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"token_policy_user\",\"password\":\"passw0rd!\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(header().string(HttpHeaders.SET_COOKIE,
                        org.hamcrest.Matchers.allOf(
                                org.hamcrest.Matchers.containsString(AccessTokenService.COOKIE_NAME + "="),
                                org.hamcrest.Matchers.containsString("Max-Age=2592000"),
                                org.hamcrest.Matchers.containsString("HttpOnly"),
                                org.hamcrest.Matchers.containsString("Secure"),
                                org.hamcrest.Matchers.containsString("SameSite=Lax"),
                                org.hamcrest.Matchers.containsString("Path=/"))))
                .andReturn();

        Cookie token = result.getResponse().getCookie(AccessTokenService.COOKIE_NAME);
        assertThat(token).isNotNull();
        assertThat(token.getValue()).hasSize(43);
        String storedHash = jdbc.queryForObject("""
                SELECT token_hash
                  FROM auth_access_token token
                  JOIN app_user user ON user.id = token.user_id
                 WHERE user.username = 'token_policy_user'
                """, String.class);
        assertThat(storedHash).hasSize(64).isNotEqualTo(token.getValue());

        mvc.perform(get("/api/v1/auth/me").cookie(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("token_policy_user"));

        jdbc.update("UPDATE auth_access_token SET expires_at = 0 WHERE token_hash = ?", storedHash);
        mvc.perform(get("/api/v1/auth/me").cookie(token))
                .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/v1/auth/me").cookie(new Cookie("JSESSIONID", "legacy-session")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void quickLoginListsTwentySeedsAndNewSignupsThenIssuesTheirToken() throws Exception {
        mvc.perform(get("/api/v1/auth/quick-accounts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("test01"))
                .andExpect(jsonPath("$[19].username").value("test20"));

        mvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"panel_user\",\"password\":\"passw0rd!\"}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/auth/quick-accounts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.username == 'panel_user')]").exists());

        Cookie quickToken = mvc.perform(post("/api/v1/auth/quick-login/test01")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("test01"))
                .andReturn().getResponse().getCookie(AccessTokenService.COOKIE_NAME);
        mvc.perform(get("/api/v1/home").cookie(quickToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productCount").value(0))
                .andExpect(jsonPath("$.recordCount").value(0));
    }

    @Test
    void regularUserCannotResetDemoData() throws Exception {
        Cookie session = signUpToken("reset_user");
        mvc.perform(post("/api/v1/demo/reset?scenario=default").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("DEMO_ONLY"));
    }

    @Test
    void accountDeletionRemovesCredentialsAndPersonalData() throws Exception {
        Cookie session = signUpToken("delete_user");
        addProduct(session, 1);
        mvc.perform(delete("/api/v1/auth/me").cookie(session))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"delete_user\",\"password\":\"passw0rd!\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void productExperienceCanBeStartedRecordedAndCompleted() throws Exception {
        Cookie session = signUpToken("flow_user");
        String ownedBody = mvc.perform(post("/api/v1/me/products").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":1}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long userProductId = json.readTree(ownedBody).path("id").asLong();

        String sessionBody = mvc.perform(post("/api/v1/me/experiences").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userProductId":%d,"mode":"PRODUCT","dayPart":"EVENING","clientRequestId":"test-start-flow"}
                                """.formatted(userProductId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andReturn().getResponse().getContentAsString();
        long experienceId = json.readTree(sessionBody).path("id").asLong();

        mvc.perform(post("/api/v1/me/experiences/{id}/records", experienceId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sentiment":"LIKED","note":"가볍고 산뜻했어요","tags":["가벼움"],"discomfort":"NOT_REPORTED","clientRequestId":"test-record-flow"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.record.note").value("가볍고 산뜻했어요"));

        mvc.perform(post("/api/v1/me/experiences/{id}/complete", experienceId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/me/experiences/{id}/records", experienceId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sentiment":"LIKED","note":"닫힌 뒤 기록","tags":[],"discomfort":"NOT_REPORTED","clientRequestId":"test-record-after-close"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EXPERIENCE_CLOSED"));
        mvc.perform(get("/api/v1/home").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.primaryAction").value("START_EXPERIENCE"));
    }

    @Test
    void notificationStateIsPrivateAndIndependentFromExperienceDueState() throws Exception {
        Cookie owner = signUpToken("notification_owner");
        long userProductId = addProduct(owner, 1);
        String experienceBody = mvc.perform(post("/api/v1/me/experiences").cookie(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userProductId":%d,"mode":"PRODUCT","dayPart":"EVENING","clientRequestId":"notification-lifecycle"}
                                """.formatted(userProductId)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long experienceId = json.readTree(experienceBody).path("id").asLong();

        jdbc.update("""
                UPDATE notification
                   SET available_at = CASE notification_type
                       WHEN 'EXPERIENCE_CHECK_IN' THEN datetime('now', '-2 hour')
                       ELSE datetime('now', '-1 hour') END
                 WHERE experience_id = ?
                """, experienceId);
        jdbc.update("UPDATE experience_session SET review_due_at = datetime('now', '-1 day') WHERE id = ?", experienceId);

        String inboxBody = mvc.perform(get("/api/v1/me/notifications").cookie(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(2))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andReturn().getResponse().getContentAsString();
        JsonNode items = json.readTree(inboxBody).path("items");
        long checkInId = 0;
        long reviewId = 0;
        for (JsonNode item : items) {
            if (item.path("type").asText().equals("EXPERIENCE_CHECK_IN")) checkInId = item.path("id").asLong();
            if (item.path("type").asText().equals("EXPERIENCE_REVIEW_DUE")) reviewId = item.path("id").asLong();
        }
        assertThat(checkInId).isPositive();
        assertThat(reviewId).isPositive();

        mvc.perform(post("/api/v1/me/notifications/{id}/read", checkInId).cookie(owner)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true))
                .andExpect(jsonPath("$.completed").value(false));
        mvc.perform(get("/api/v1/me/experiences/{id}", experienceId).cookie(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.reviewDue").value(true));

        mvc.perform(post("/api/v1/me/notifications/{id}/snooze", reviewId).cookie(owner)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"durationHours\":24}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.snoozedUntil").isString())
                .andExpect(jsonPath("$.completed").value(false));
        mvc.perform(get("/api/v1/me/notifications").cookie(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0))
                .andExpect(jsonPath("$.items.length()").value(1));

        Cookie other = signUpToken("notification_other");
        mvc.perform(post("/api/v1/me/notifications/{id}/read", checkInId).cookie(other)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());

        jdbc.update("UPDATE notification SET snoozed_until = NULL WHERE id = ?", reviewId);
        mvc.perform(post("/api/v1/me/experiences/{id}/records", experienceId).cookie(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sentiment":"LIKED","note":"7일 사용 맥락을 돌아봤어요","tags":[],"discomfort":"NOT_REPORTED","clientRequestId":"notification-review-record"}
                                """))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/me/notifications").cookie(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0))
                .andExpect(jsonPath("$.items[0].id").value(reviewId))
                .andExpect(jsonPath("$.items[0].completed").value(true));
    }

    @Test
    void customProductIsOwnerScopedAndProjectsShelfState() throws Exception {
        Cookie owner = signUpToken("custom_product_owner");
        String customBody = mvc.perform(post("/api/v1/me/products").cookie(owner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customBrand":"직접 입력 브랜드","customName":"목록에 없는 세럼","customCategory":"세럼"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.product").doesNotExist())
                .andExpect(jsonPath("$.personalRecordCount").value(0))
                .andExpect(jsonPath("$.inCurrentRoutine").value(false))
                .andReturn().getResponse().getContentAsString();
        long userProductId = json.readTree(customBody).path("id").asLong();

        mvc.perform(put("/api/v1/me/routines/current").cookie(owner)
                        .header("Idempotency-Key", "custom-product-routine")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"직접 등록 제품 루틴","items":[
                                  {"userProductId":%d,"timeSlot":"EVENING","frequency":"매일"}
                                ]}
                                """.formatted(userProductId)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/me/products/{id}", userProductId).cookie(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customName").value("목록에 없는 세럼"))
                .andExpect(jsonPath("$.inCurrentRoutine").value(true));

        Cookie other = signUpToken("custom_product_other");
        mvc.perform(get("/api/v1/me/products/{id}", userProductId).cookie(other))
                .andExpect(status().isNotFound());
    }

    @Test
    void everyAssistantTurnContainsDynamicSuggestionsEvenWhenAiFallsBack() throws Exception {
        Cookie session = signUpToken("chat_user");
        String body = mvc.perform(post("/api/v1/ai/conversations").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"GENERAL","initialPrompt":"내 최근 기록을 알려줘","clientRequestId":"test-chat-create"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.messages[1].role").value("ASSISTANT"))
                .andExpect(jsonPath("$.messages[1].suggestedReplies").isArray())
                .andExpect(jsonPath("$.quickReplies").isArray())
                .andReturn().getResponse().getContentAsString();
        JsonNode response = json.readTree(body);
        assertThat(response.path("quickReplies").size()).isBetween(1, 3);
        assertThat(response.path("messages").get(1).path("content").asText())
                .doesNotContain("AI 연결이 잠시 원활하지 않아요")
                .contains("지금 저장된 내 데이터");
    }

    @Test
    void productAndPatternModesReturnDomainAnswersWhenAiProviderIsUnavailable() throws Exception {
        Cookie session = demoToken();
        String productBody = mvc.perform(post("/api/v1/ai/conversations").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"PRODUCT","productId":1,"initialPrompt":"이 제품 어때?","clientRequestId":"test-product-domain-fallback"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.messages[1].status").value("FALLBACK"))
                .andExpect(jsonPath("$.messages[1].evidenceRefs[0]").value("P-1"))
                .andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(productBody).path("messages").get(1).path("content").asText())
                .contains("지금 확인한 제품은")
                .doesNotContain("AI 연결이 잠시 원활하지 않아요");

        String patternBody = mvc.perform(post("/api/v1/ai/conversations").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"PATTERN","initialPrompt":"내 기록에서 반복되는 패턴을 보여줘","clientRequestId":"test-pattern-domain-fallback"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.messages[1].status").value("FALLBACK"))
                .andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(patternBody).path("messages").get(1).path("content").asText())
                .containsAnyOf("반복해서 연결된 패턴", "반복 패턴으로 보여줄 근거")
                .doesNotContain("AI 연결이 잠시 원활하지 않아요");
    }

    @Test
    void assistantWebSourcesAreReturnedWithTheirValidatedPriorityTier() throws Exception {
        Cookie session = signUpToken("citation_user");
        String body = mvc.perform(post("/api/v1/ai/conversations").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"GENERAL","initialPrompt":"제품 정보를 확인해줘","clientRequestId":"test-citation-create"}
                                """))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        JsonNode created = json.readTree(body);
        long conversationId = created.path("id").asLong();
        long assistantMessageId = created.path("messages").get(1).path("id").asLong();
        jdbc.update("""
                INSERT INTO conversation_message_source(message_id, source_order, title, url, source_tier)
                VALUES (?, 1, '브랜드 공식 제품 안내', 'https://example.com/official-product', 'P1')
                """, assistantMessageId);

        mvc.perform(get("/api/v1/ai/conversations/{id}", conversationId).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[1].webSources[0].ref").value("S-1"))
                .andExpect(jsonPath("$.messages[1].webSources[0].title").value("브랜드 공식 제품 안내"))
                .andExpect(jsonPath("$.messages[1].webSources[0].url").value("https://example.com/official-product"))
                .andExpect(jsonPath("$.messages[1].webSources[0].tier").value("P1"));
    }

    @Test
    void generalDiscomfortPromptStartsInRescueMode() throws Exception {
        Cookie session = demoToken();
        mvc.perform(post("/api/v1/ai/conversations").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"GENERAL","initialPrompt":"새 제품을 썼더니 피부가 따갑고 붉어졌어","clientRequestId":"test-auto-rescue-create"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mode").value("RESCUE"))
                .andExpect(jsonPath("$.messages[1].content").value(org.hamcrest.Matchers.containsString("심하거나 빠르게 악화")))
                .andExpect(jsonPath("$.quickReplies[0]").value("심하거나 빠르게 악화되진 않아요"));
    }

    @Test
    void discomfortMessageTurnsAnExistingAiConversationIntoRescue() throws Exception {
        Cookie session = demoToken();
        String created = mvc.perform(post("/api/v1/ai/conversations").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"GENERAL","initialPrompt":"내 최근 기록을 요약해줘","clientRequestId":"test-auto-rescue-thread"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mode").value("GENERAL"))
                .andReturn().getResponse().getContentAsString();
        long conversationId = json.readTree(created).path("id").asLong();

        mvc.perform(post("/api/v1/ai/conversations/{id}/messages", conversationId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"text":"지금 피부가 화끈거리고 따가워","clientRequestId":"test-auto-rescue-message"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("RESCUE"))
                .andExpect(jsonPath("$.messages[3].content").value(org.hamcrest.Matchers.containsString("심하거나 빠르게 악화")));
    }

    @Test
    void recommendationConversationUsesItsOwnCatalogBoundedMode() throws Exception {
        Cookie session = demoToken();
        mvc.perform(post("/api/v1/ai/conversations").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"RECOMMEND","initialPrompt":"내 기록으로 다음 제품 후보를 보여줘","clientRequestId":"test-recommend-create"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mode").value("RECOMMEND"))
                .andExpect(jsonPath("$.messages[1].suggestedReplies").isArray());
    }

    @Test
    void explicitRecommendationIntentStartsInRecommendationModeAndStillNamesAProductOnAiFailure() throws Exception {
        Cookie session = demoToken();
        mvc.perform(post("/api/v1/ai/conversations").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"GENERAL","initialPrompt":"그냥 하나 추천해줘. 지금 즉시","clientRequestId":"test-auto-recommend-create"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mode").value("RECOMMEND"))
                .andExpect(jsonPath("$.messages[1].content").value(org.hamcrest.Matchers.containsString("지금 하나만 고르면")))
                .andExpect(jsonPath("$.messages[1].evidenceRefs[0]").value(org.hamcrest.Matchers.startsWith("P-")));
    }

    @Test
    void explicitRecommendationIntentTurnsAnExistingGeneralThreadIntoRecommendationMode() throws Exception {
        Cookie session = demoToken();
        String created = mvc.perform(post("/api/v1/ai/conversations").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"GENERAL","initialPrompt":"내 최근 기록을 요약해줘","clientRequestId":"test-recommend-thread"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long conversationId = json.readTree(created).path("id").asLong();

        mvc.perform(post("/api/v1/ai/conversations/{id}/messages", conversationId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"text":"기준 말고 제품 하나 골라줘","clientRequestId":"test-auto-recommend-message"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("RECOMMEND"))
                .andExpect(jsonPath("$.messages[3].content").value(org.hamcrest.Matchers.containsString("지금 하나만 고르면")));
    }

    @Test
    void recommendationUsesTheExistingConversationToNarrowTheCatalogCandidates() throws Exception {
        Cookie session = demoToken();
        String created = mvc.perform(post("/api/v1/ai/conversations").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"GENERAL","initialPrompt":"밖에 오래 있는 날 바르는 게 귀찮아","clientRequestId":"test-suncare-thread"}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long conversationId = json.readTree(created).path("id").asLong();

        String recommended = mvc.perform(post("/api/v1/ai/conversations/{id}/messages", conversationId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"text":"그냥 하나 추천해줘","clientRequestId":"test-suncare-recommend"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("RECOMMEND"))
                .andReturn().getResponse().getContentAsString();
        JsonNode messages = json.readTree(recommended).path("messages");
        String productRef = messages.get(messages.size() - 1).path("evidenceRefs").get(0).asText();
        long productId = Long.parseLong(productRef.substring(2));

        mvc.perform(get("/api/v1/products/{id}", productId).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").value(org.hamcrest.Matchers.containsString("선")));
    }

    @Test
    void rescueDoesNotCreateAPlanUntilRecordedChangesAreConfirmed() throws Exception {
        Cookie session = demoToken();
        String created = mvc.perform(post("/api/v1/ai/conversations").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"RESCUE","experienceId":3,"initialPrompt":"따갑고 답답했어","clientRequestId":"test-rescue-confirm-start"}
                                """))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long conversationId = json.readTree(created).path("id").asLong();
        mvc.perform(post("/api/v1/ai/conversations/{id}/messages", conversationId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"심하거나 빠르게 악화되진 않아요\",\"clientRequestId\":\"test-rescue-confirm-safe\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[3].status").value("FALLBACK"))
                .andExpect(jsonPath("$.messages[3].content").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("AI 연결이 잠시 원활하지 않아요"))));
        mvc.perform(post("/api/v1/ai/conversations/{id}/messages", conversationId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"클렌저도 따로 바꿨어\",\"clientRequestId\":\"test-rescue-correction\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rescuePlan").doesNotExist())
                .andExpect(jsonPath("$.messages[5].content").value(org.hamcrest.Matchers.containsString("저장된 루틴과 달라서")));
        mvc.perform(post("/api/v1/ai/conversations/{id}/messages", conversationId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"저장된 변경만으로 계속할게요\",\"clientRequestId\":\"test-rescue-confirm-changes\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rescuePlan.status").value("PROPOSED"))
                .andExpect(jsonPath("$.messages[7].content").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("AI 연결이 잠시 원활하지 않아요"))));
    }

    @Test
    void dueRoutineReviewCompletesExperienceAndBecomesComparisonBaseline() throws Exception {
        Cookie session = signUpToken("review_user");
        String ownedBody = mvc.perform(post("/api/v1/me/products").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":1}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long userProductId = json.readTree(ownedBody).path("id").asLong();

        String experienceBody = mvc.perform(post("/api/v1/me/experiences").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userProductId":%d,"mode":"ROUTINE","dayPart":"EVENING","clientRequestId":"test-due-routine"}
                                """.formatted(userProductId)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        JsonNode experience = json.readTree(experienceBody);
        long experienceId = experience.path("id").asLong();
        long routineId = experience.path("routineId").asLong();
        jdbc.update("UPDATE experience_session SET review_due_at = datetime('now', '-1 day') WHERE id = ?", experienceId);

        mvc.perform(post("/api/v1/me/experiences/{id}/records", experienceId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sentiment":"LIKED","note":"일주일 동안 편하게 썼어요","tags":["편안함"],"discomfort":"NOT_REPORTED","clientRequestId":"test-due-record"}
                                """))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/v1/home").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentExperience").doesNotExist())
                .andExpect(jsonPath("$.primaryAction").value("START_EXPERIENCE"));
        mvc.perform(get("/api/v1/me/routines/baseline").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(routineId));
        mvc.perform(get("/api/v1/products/1").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.personalRecordCount").value(1));
    }

    @Test
    void repeatedTaggedExperiencesCreateAPersonalPatternForANewUser() throws Exception {
        Cookie session = signUpToken("pattern_user");
        String ownedBody = mvc.perform(post("/api/v1/me/products").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"productId\":1}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long userProductId = json.readTree(ownedBody).path("id").asLong();
        String experienceBody = mvc.perform(post("/api/v1/me/experiences").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"userProductId":%d,"mode":"PRODUCT","dayPart":"EVENING","clientRequestId":"test-pattern-session"}
                                """.formatted(userProductId)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long experienceId = json.readTree(experienceBody).path("id").asLong();

        mvc.perform(post("/api/v1/me/experiences/{id}/records", experienceId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sentiment":"LIKED","note":"첫 사용","tags":["가벼움"],"discomfort":"NOT_REPORTED","clientRequestId":"test-pattern-record-1"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.linkedPatternId").doesNotExist());
        mvc.perform(post("/api/v1/me/experiences/{id}/records", experienceId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sentiment":"LIKED","note":"두 번째 사용","tags":["가벼움"],"discomfort":"NOT_REPORTED","clientRequestId":"test-pattern-record-2"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.linkedPatternId").isNumber());

        mvc.perform(get("/api/v1/me/patterns").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].supportingCount").value(2))
                .andExpect(jsonPath("$[0].title").value("가벼움이 좋았다고 남긴 기록이 반복됐어요"));
    }

    @Test
    void routineStoresTimeSlotFrequencyAndOrderPerProduct() throws Exception {
        Cookie session = signUpToken("routine_user");
        long first = addProduct(session, 1);
        long second = addProduct(session, 6);

        String createdBody = mvc.perform(put("/api/v1/me/routines/current").cookie(session)
                        .header("Idempotency-Key", "test-routine-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"내 스킨케어 루틴",
                                  "items":[
                                    {"userProductId":%d,"timeSlot":"BOTH","frequency":"매일"},
                                    {"userProductId":%d,"timeSlot":"EVENING","frequency":"주 2~3회"}
                                  ]
                                }
                                """.formatted(first, second)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.routine.items[0].timeSlot").value("BOTH"))
                .andExpect(jsonPath("$.routine.items[0].frequency").value("매일"))
                .andExpect(jsonPath("$.routine.items[1].timeSlot").value("EVENING"))
                .andExpect(jsonPath("$.routine.items[1].frequency").value("주 2~3회"))
                .andExpect(jsonPath("$.latestRecord").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        JsonNode created = json.readTree(createdBody);
        long routineId = created.path("routineId").asLong();
        long experienceId = created.path("id").asLong();

        mvc.perform(get("/api/v1/me/routines/{id}", routineId).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(routineId))
                .andExpect(jsonPath("$.items.length()").value(2));

        mvc.perform(post("/api/v1/me/routines/{id}/name-suggestion", routineId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("아침과 저녁에 쓰는 루틴"))
                .andExpect(jsonPath("$.aiGenerated").value(false));

        jdbc.update("""
                INSERT INTO routine_insight(
                    routine_id, insight_text, model, prompt_version, input_snapshot_json
                ) VALUES (?, ?, 'test-model', 'routine-insight-test', '{}')
                """, routineId, "가벼운 사용감을 편하게 느낀 흐름을 이어가는 아침과 저녁 조합이에요.");
        jdbc.update("INSERT INTO routine_insight_keyword(routine_id, position, keyword) VALUES (?, 0, '가벼운 마무리')", routineId);
        jdbc.update("INSERT INTO routine_insight_keyword(routine_id, position, keyword) VALUES (?, 1, '아침 저녁')", routineId);
        mvc.perform(get("/api/v1/me/routines/{id}", routineId).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.insight.text")
                        .value("가벼운 사용감을 편하게 느낀 흐름을 이어가는 아침과 저녁 조합이에요."))
                .andExpect(jsonPath("$.insight.keywords[0]").value("가벼운 마무리"))
                .andExpect(jsonPath("$.insight.keywords[1]").value("아침 저녁"));
        mvc.perform(post("/api/v1/me/routines/{id}/insight", routineId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text")
                        .value("가벼운 사용감을 편하게 느낀 흐름을 이어가는 아침과 저녁 조합이에요."));

        mvc.perform(put("/api/v1/me/routines/{id}/name", routineId).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"아침 저녁 균형 루틴"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("아침 저녁 균형 루틴"));
        mvc.perform(get("/api/v1/me/experiences/{id}", experienceId).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("아침 저녁 균형 루틴"));

        Cookie other = signUpToken("routine_other");
        mvc.perform(get("/api/v1/me/routines/{id}", routineId).cookie(other))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/me/routines/{id}/name-suggestion", routineId).cookie(other)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/me/routines/{id}/insight", routineId).cookie(other)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound());

        mvc.perform(get("/api/v1/me/experience-records").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void routineArchiveKeepsEverySavedVersionVisibleAndOwnerScoped() throws Exception {
        Cookie owner = signUpToken("routine_archive_owner");
        long userProductId = addProduct(owner, 1);

        String firstBody = mvc.perform(put("/api/v1/me/routines/current").cookie(owner)
                        .header("Idempotency-Key", "routine-archive-first")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"첫 번째 루틴","items":[
                                  {"userProductId":%d,"timeSlot":"EVENING","frequency":"매일"}
                                ]}
                                """.formatted(userProductId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long firstRoutineId = json.readTree(firstBody).path("routineId").asLong();

        String secondBody = mvc.perform(put("/api/v1/me/routines/current").cookie(owner)
                        .header("Idempotency-Key", "routine-archive-second")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"두 번째 루틴","items":[
                                  {"userProductId":%d,"timeSlot":"BOTH","frequency":"주 2~3회"}
                                ]}
                                """.formatted(userProductId)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long secondRoutineId = json.readTree(secondBody).path("routineId").asLong();

        mvc.perform(get("/api/v1/me/routines").cookie(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(secondRoutineId))
                .andExpect(jsonPath("$[0].status").value("CURRENT"))
                .andExpect(jsonPath("$[1].id").value(firstRoutineId))
                .andExpect(jsonPath("$[1].status").value("PAST"));

        Cookie other = signUpToken("routine_archive_other");
        mvc.perform(get("/api/v1/me/routines").cookie(other))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void brandLogoIsProjectedWithoutInventingALegalManufacturer() throws Exception {
        Cookie session = demoToken();
        String logoUrl = "/manufacturer-logos/nature-republic.png";

        assertThat(jdbc.queryForList("""
                SELECT DISTINCT logo_url FROM brand_asset
                 WHERE brand IN ('CNP', 'CNP차앤박', '차앤박')
                """, String.class)).containsExactly("/manufacturer-logos/cnp.png");

        mvc.perform(get("/api/v1/products/2").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.brand").value("바이옴"))
                .andExpect(jsonPath("$.brandLogoUrl").doesNotExist());

        jdbc.update("""
                INSERT INTO brand_asset(brand, logo_url, source_url)
                VALUES ('뉴트리랩', ?, NULL)
                ON CONFLICT(brand) DO UPDATE SET logo_url = excluded.logo_url,
                                                 source_url = excluded.source_url
                """, logoUrl);
        jdbc.update("INSERT INTO brand_asset(brand, logo_url) VALUES ('직접 입력 브랜드', ?)", logoUrl);
        Long customUserProductId = jdbc.queryForObject("""
                INSERT INTO user_product(user_id, custom_brand, custom_name, custom_category)
                VALUES (1, '직접 입력 브랜드', '나만의 크림', '크림') RETURNING id
                """, Long.class);
        try {
            mvc.perform(get("/api/v1/products/1").cookie(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.brand").value("뉴트리랩"))
                    .andExpect(jsonPath("$.brandLogoUrl").value(logoUrl));

            mvc.perform(get("/api/v1/me/products/1").cookie(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.brandLogoUrl").value(logoUrl))
                    .andExpect(jsonPath("$.product.brandLogoUrl").value(logoUrl));

            mvc.perform(get("/api/v1/me/products/{id}", customUserProductId).cookie(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.customBrand").value("직접 입력 브랜드"))
                    .andExpect(jsonPath("$.brandLogoUrl").value(logoUrl))
                    .andExpect(jsonPath("$.product").doesNotExist());

            String routineBody = mvc.perform(get("/api/v1/me/routines/current").cookie(session))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            JsonNode nutrilabItem = json.readTree(routineBody).path("items").valueStream()
                    .filter(item -> item.path("userProductId").asLong() == 1)
                    .findFirst().orElseThrow();
            assertThat(nutrilabItem.path("brandLogoUrl").asText()).isEqualTo(logoUrl);
        } finally {
            jdbc.update("DELETE FROM user_product WHERE id = ?", customUserProductId);
            jdbc.update("DELETE FROM brand_asset WHERE brand IN ('뉴트리랩', '직접 입력 브랜드')");
        }
    }

    private Cookie demoToken() throws Exception {
        return mvc.perform(post("/api/v1/auth/demo")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie(AccessTokenService.COOKIE_NAME);
    }

    private Cookie signUpToken(String username) throws Exception {
        return mvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"passw0rd!"}
                                """.formatted(username)))
                .andExpect(status().isCreated()).andReturn().getResponse().getCookie(AccessTokenService.COOKIE_NAME);
    }

    private long addProduct(Cookie session, long productId) throws Exception {
        String body = mvc.perform(post("/api/v1/me/products").cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + productId + "}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).path("id").asLong();
    }

    private void insertCatalogProduct(long id, String brand, String name, String category) {
        jdbc.update("""
                INSERT INTO product(id, brand, name, category, description, texture, verified, facts_json)
                VALUES (?, ?, ?, ?, '정렬 계약 테스트 제품', '테스트 제형', 0, '[]')
                """, id, brand, name, category);
        jdbc.update("""
                INSERT INTO product_catalog_content(
                    product_id, summary, routine_step, usage_type, usage_timing_json,
                    usage_tips_json, observation_points_json, origin, generated_at
                ) VALUES (?, '정렬 계약 테스트 안내', '테스트 단계', '테스트 유형', '[]', '[]', '[]',
                          'EDITORIAL', CURRENT_TIMESTAMP)
                """, id);
    }
}
