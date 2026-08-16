package app.skn.ai;

import app.skn.config.OpenAiProperties;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class OpenAiGatewayTest {
    private final ObjectMapper json = new ObjectMapper();
    private final OpenAiGateway gateway = new OpenAiGateway(new OpenAiProperties(
            "test-key", "gpt-5.6-terra", "low", Duration.ofSeconds(1), Duration.ofSeconds(1),
            1_800, true, "low"
    ), json);

    @Test
    void projectsApiCitationAnnotationsIntoClickableMarkdownAndValidatedSources() throws Exception {
        String url = "https://www.laneige.com/kr/ko/product/lip-glowy-balm.html?utm_source=openai";
        String classifiedUrl = "https://www.laneige.com/kr/ko/product/lip-glowy-balm.html";
        String citationMarker = "([laneige.com](" + url + "))";
        String answer = "공식 안내에서 글로시한 마무리의 립밤으로 소개해요. " + citationMarker;
        String outputText = json.writeValueAsString(Map.of(
                "answer", answer,
                "suggestedReplies", List.of("내 립 제품 기록과 비교해줘"),
                "evidenceRefs", List.of("P-11", "P-999"),
                "sourceClassifications", List.of(Map.of("url", classifiedUrl, "tier", "P1"))
        ));
        int citationStart = outputText.indexOf(citationMarker);
        int citationEnd = citationStart + citationMarker.length();
        String responseBody = json.writeValueAsString(Map.of(
                "output", List.of(
                        Map.of(
                                "type", "web_search_call",
                                "status", "completed",
                                "action", Map.of(
                                        "type", "search",
                                        "sources", List.of(Map.of("url", url, "title", "Lip Glowy Balm | LANEIGE"))
                                )
                        ),
                        Map.of(
                                "type", "message",
                                "content", List.of(Map.of(
                                        "type", "output_text",
                                        "text", outputText,
                                        "annotations", List.of(Map.of(
                                                "type", "url_citation",
                                                "start_index", citationStart,
                                                "end_index", citationEnd,
                                                "url", url,
                                                "title", "Lip Glowy Balm | LANEIGE"
                                        ))
                                ))
                        )
                )
        ));

        OpenAiGateway.ParsedResponse result = gateway.parseResponse(responseBody, "P-11 제품: 라네즈 / 립 글로이 밤 / 립케어");

        assertThat(result.answer()).contains("[1](https://www.laneige.com/kr/ko/product/lip-glowy-balm.html?utm_source=openai)");
        assertThat(result.answer()).doesNotContain(citationMarker);
        assertThat(result.evidenceRefs()).containsExactly("P-11");
        assertThat(result.webSources()).hasSize(1);
        assertThat(result.webSources().get(0).tier()).isEqualTo("P1");
        assertThat(result.webSources().get(0).url()).isEqualTo(url);
    }

    @Test
    void publicAndResearchDomainsOverrideAnUnsafeModelClassification() throws Exception {
        assertThat(sourceTier("https://www.mfds.go.kr/brd/m_99/view.do", "식약처 안내", "P1")).isEqualTo("P2");
        assertThat(sourceTier("https://pubmed.ncbi.nlm.nih.gov/1234/", "A randomized study", "P1")).isEqualTo("P3");
    }

    @Test
    void parsesRoutineIdentityWithAFreeTextInsight() throws Exception {
        String outputText = json.writeValueAsString(Map.of(
                "name", "크림으로 마치는 저녁 루틴",
                "insight", "가벼운 사용감을 편하게 느낀 흐름을 이어, 저녁에는 수분감은 남기되 여러 겹의 답답함은 덜어낸 조합이에요.",
                "keywords", List.of("가벼운 마무리", "저녁 중심", "촉촉한 사용감")
        ));
        String responseBody = json.writeValueAsString(Map.of(
                "output", List.of(Map.of(
                        "type", "message",
                        "content", List.of(Map.of("type", "output_text", "text", outputText))
                ))
        ));

        OpenAiGateway.RoutineIdentityResult result = gateway.parseRoutineIdentity(responseBody);

        assertThat(result.name()).isEqualTo("크림으로 마치는 저녁 루틴");
        assertThat(result.insight()).contains("가벼운 사용감").contains("답답함");
        assertThat(result.keywords()).containsExactly("가벼운 마무리", "저녁 중심", "촉촉한 사용감");
    }

    private String sourceTier(String url, String title, String requestedTier) throws Exception {
        String marker = "\uE200cite\uE202turn0search0\uE201";
        String outputText = json.writeValueAsString(Map.of(
                "answer", "확인했어요. " + marker,
                "suggestedReplies", List.of("더 알려줘"),
                "evidenceRefs", List.of(),
                "sourceClassifications", List.of(Map.of("url", url, "tier", requestedTier))
        ));
        int start = outputText.indexOf(marker);
        String body = json.writeValueAsString(Map.of("output", List.of(
                Map.of("type", "web_search_call", "action", Map.of("sources", List.of(Map.of("url", url)))),
                Map.of("type", "message", "content", List.of(Map.of(
                        "type", "output_text", "text", outputText,
                        "annotations", List.of(Map.of(
                                "type", "url_citation", "start_index", start, "end_index", start + marker.length(),
                                "url", url, "title", title
                        ))
                )))
        )));
        return gateway.parseResponse(body, "").webSources().get(0).tier();
    }
}
