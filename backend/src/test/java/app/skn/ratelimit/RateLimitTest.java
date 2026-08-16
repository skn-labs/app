package app.skn.ratelimit;

import app.skn.auth.AccessTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import jakarta.servlet.http.Cookie;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.rate-limit.enabled=true",
        "app.rate-limit.per-minute=3",
        "app.rate-limit.per-hour=100000",
        "app.rate-limit.per-day=100000"
})
class RateLimitTest {
    @Autowired MockMvc mvc;

    @Test
    void aiConversationRequestsWithinLimitAllPass() throws Exception {
        Cookie session = signUpToken("rate_within_user");
        for (int i = 0; i < 3; i++) {
            mvc.perform(createConversation(session, "within-" + i))
                    .andExpect(status().isCreated());
        }
    }

    @Test
    void aiConversationRequestsOverLimitAreRejectedWith429() throws Exception {
        Cookie session = signUpToken("rate_over_user");
        for (int i = 0; i < 3; i++) {
            mvc.perform(createConversation(session, "over-" + i))
                    .andExpect(status().isCreated());
        }
        mvc.perform(createConversation(session, "over-blocked"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    }

    @Test
    void rateLimitDoesNotBlockNonTriggeringReads() throws Exception {
        Cookie session = signUpToken("rate_reads_user");
        for (int i = 0; i < 3; i++) {
            mvc.perform(createConversation(session, "reads-" + i))
                    .andExpect(status().isCreated());
        }
        // 한도를 채운 뒤에도 GET(비 트리거) 조회는 그대로 통과한다.
        mvc.perform(get("/api/v1/ai/conversations").cookie(session))
                .andExpect(status().isOk());
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder createConversation(
            Cookie session, String clientRequestId) {
        return post("/api/v1/ai/conversations").cookie(session)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"mode":"GENERAL","initialPrompt":"내 기록을 요약해줘","clientRequestId":"%s"}
                        """.formatted(clientRequestId));
    }

    private Cookie signUpToken(String username) throws Exception {
        return mvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"passw0rd!"}
                                """.formatted(username)))
                .andExpect(status().isCreated()).andReturn().getResponse().getCookie(AccessTokenService.COOKIE_NAME);
    }
}
