package app.skn.ai;

import app.skn.api.ApiModels.WebSourceView;
import app.skn.config.OpenAiProperties;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.URI;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class OpenAiGateway {
    private static final Logger log = LoggerFactory.getLogger(OpenAiGateway.class);
    private static final Pattern EVIDENCE_REF = Pattern.compile("(?<![A-Z0-9-])(PT|P|R|E)-\\d+");
    private static final Pattern ANSWER_FIELD = Pattern.compile("\\\"answer\\\"\\s*:\\s*\\\"");
    private static final Pattern OPENAI_CITATION_MARKER = Pattern.compile("\\uE200cite\\uE202[^\\uE201]+\\uE201");
    private static final Pattern RETRY_SECONDS = Pattern.compile("try again in ([0-9]+(?:\\.[0-9]+)?)s", Pattern.CASE_INSENSITIVE);
    private static final Set<String> SOURCE_TIERS = Set.of("P1", "P2", "P3", "P4");

    private final OpenAiProperties properties;
    private final RestClient client;
    private final ObjectMapper objectMapper;

    public OpenAiGateway(OpenAiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.connectTimeout());
        factory.setReadTimeout(properties.readTimeout());
        this.client = RestClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .requestFactory(factory)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public AiResult answer(String mode, String instructions, String context, String userMessage) {
        return answer(mode, instructions, context, userMessage, false);
    }

    public AiResult answer(String mode, String instructions, String context, String userMessage,
                           boolean requireWebSearch) {
        if (!properties.configured()) return fallback(mode);

        String input = """
                [서버가 확인한 개인 맥락]
                %s

                [사용자 메시지]
                %s
                """.formatted(context, userMessage);
        Map<String, Object> schema = responseSchema();
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("model", properties.model());
        request.put("instructions", instructions);
        request.put("input", input);
        request.put("reasoning", Map.of("effort", properties.reasoningEffort()));
        request.put("text", Map.of("format", Map.of(
                "type", "json_schema",
                "name", "skn_grounded_chat_response",
                "strict", true,
                "schema", schema
        )));
        request.put("max_output_tokens", properties.maxOutputTokens());
        request.put("store", false);
        if (properties.webSearchEnabled()) {
            request.put("tools", List.of(Map.of(
                    "type", "web_search",
                    "search_context_size", normalizedSearchContextSize(),
                    "user_location", Map.of(
                            "type", "approximate",
                            "country", "KR",
                            "timezone", "Asia/Seoul"
                    )
            )));
            request.put("tool_choice", requireWebSearch ? "required" : "auto");
            request.put("include", List.of("web_search_call.action.sources"));
        }

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String body = client.post()
                        .uri("/responses")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                        .body(request)
                        .retrieve()
                        .body(String.class);
                ParsedResponse parsed = parseResponse(body, context);
                if (parsed.answer().isBlank()) {
                    throw new IllegalStateException("OpenAI 구조화 응답의 답변이 비어 있습니다.");
                }
                return new AiResult(
                        parsed.answer(),
                        "READY",
                        parsed.suggestedReplies(),
                        parsed.evidenceRefs(),
                        parsed.webSources()
                );
            } catch (RestClientResponseException error) {
                boolean retryable = error.getStatusCode().value() == 429 || error.getStatusCode().is5xxServerError();
                log.warn("OpenAI request failed: status={}, attempt={}", error.getStatusCode().value(), attempt);
                if (!retryable || attempt == 2) break;
                if (!waitBeforeRetry(error)) break;
            } catch (ResourceAccessException error) {
                log.warn("OpenAI request timed out: attempt={}", attempt);
                if (attempt == 2) break;
            } catch (Exception error) {
                log.warn("OpenAI response could not be parsed: type={}", error.getClass().getSimpleName());
                break;
            }
        }
        return fallback(mode);
    }

    /**
     * 루틴 이름과 개인 데이터 기반 도움 문장을 한 번에 만든다. 내용은 한 문장이지만
     * 전송 계약은 strict JSON Schema로 고정해 UI 필드가 서로 섞이지 않게 한다.
     */
    public RoutineIdentityResult routineIdentity(String instructions, String context, String userMessage) {
        if (!properties.configured()) return routineIdentityFallback();

        String input = """
                [서버가 확인한 개인 맥락]
                %s

                [요청]
                %s
                """.formatted(context, userMessage);
        Map<String, Object> schema = Map.of(
                "type", "object",
                "properties", Map.of(
                        "name", Map.of("type", "string", "maxLength", 40),
                        "insight", Map.of("type", "string", "maxLength", 70),
                        "keywords", Map.of(
                                "type", "array",
                                "minItems", 2,
                                "maxItems", 3,
                                "items", Map.of("type", "string", "maxLength", 30)
                        )
                ),
                "required", List.of("name", "insight", "keywords"),
                "additionalProperties", false
        );
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("model", properties.model());
        request.put("instructions", instructions);
        request.put("input", input);
        request.put("reasoning", Map.of("effort", properties.reasoningEffort()));
        request.put("text", Map.of("format", Map.of(
                "type", "json_schema",
                "name", "skn_routine_identity",
                "strict", true,
                "schema", schema
        )));
        request.put("max_output_tokens", Math.min(properties.maxOutputTokens(), 900));
        request.put("store", false);

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String body = client.post()
                        .uri("/responses")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                        .body(request)
                        .retrieve()
                        .body(String.class);
                RoutineIdentityResult parsed = parseRoutineIdentity(body);
                if (parsed.name().isBlank() || parsed.insight().isBlank() || parsed.keywords().size() < 2) {
                    throw new IllegalStateException("OpenAI 루틴 문장이 비어 있습니다.");
                }
                return new RoutineIdentityResult(
                        parsed.name(), parsed.insight(), parsed.keywords(), "READY", properties.model()
                );
            } catch (RestClientResponseException error) {
                boolean retryable = error.getStatusCode().value() == 429 || error.getStatusCode().is5xxServerError();
                log.warn("OpenAI routine identity request failed: status={}, attempt={}",
                        error.getStatusCode().value(), attempt);
                if (!retryable || attempt == 2) break;
                if (!waitBeforeRetry(error)) break;
            } catch (ResourceAccessException error) {
                log.warn("OpenAI routine identity request timed out: attempt={}", attempt);
                if (attempt == 2) break;
            } catch (Exception error) {
                log.warn("OpenAI routine identity response could not be parsed: type={}",
                        error.getClass().getSimpleName());
                break;
            }
        }
        return routineIdentityFallback();
    }

    RoutineIdentityResult parseRoutineIdentity(String body) throws Exception {
        JsonNode root = objectMapper.readTree(body);
        String outputText = null;
        for (JsonNode output : root.path("output")) {
            if (!"message".equals(output.path("type").asText())) continue;
            for (JsonNode content : output.path("content")) {
                if ("output_text".equals(content.path("type").asText())) {
                    outputText = content.path("text").asText();
                }
            }
        }
        if (outputText == null || outputText.isBlank()) {
            throw new IllegalStateException("OpenAI 응답에 루틴 텍스트가 없습니다.");
        }
        JsonNode structured = objectMapper.readTree(outputText);
        return new RoutineIdentityResult(
                structured.path("name").asText().trim(),
                structured.path("insight").asText().trim(),
                stringArray(structured.path("keywords"), 3, 30),
                "READY",
                properties.model()
        );
    }

    private Map<String, Object> responseSchema() {
        Map<String, Object> classification = Map.of(
                "type", "object",
                "properties", Map.of(
                        "url", Map.of("type", "string", "maxLength", 2000),
                        "tier", Map.of("type", "string", "enum", List.of("P1", "P2", "P3", "P4"))
                ),
                "required", List.of("url", "tier"),
                "additionalProperties", false
        );
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "answer", Map.of("type", "string", "maxLength", 1800),
                        "suggestedReplies", Map.of(
                                "type", "array",
                                "minItems", 1,
                                "maxItems", 3,
                                "items", Map.of("type", "string", "maxLength", 80)
                        ),
                        "evidenceRefs", Map.of(
                                "type", "array",
                                "maxItems", 8,
                                "items", Map.of("type", "string", "maxLength", 64)
                        ),
                        "sourceClassifications", Map.of(
                                "type", "array",
                                "maxItems", 8,
                                "items", classification
                        )
                ),
                "required", List.of("answer", "suggestedReplies", "evidenceRefs", "sourceClassifications"),
                "additionalProperties", false
        );
    }

    ParsedResponse parseResponse(String body, String context) throws Exception {
        JsonNode root = objectMapper.readTree(body);
        String outputText = null;
        List<RawCitation> annotations = new ArrayList<>();
        Set<String> consultedUrls = new LinkedHashSet<>();
        for (JsonNode output : root.path("output")) {
            if ("web_search_call".equals(output.path("type").asText())) {
                for (JsonNode source : output.path("action").path("sources")) {
                    validHttpsUrl(source.path("url").asText()).ifPresent(consultedUrls::add);
                }
                continue;
            }
            if (!"message".equals(output.path("type").asText())) continue;
            for (JsonNode content : output.path("content")) {
                if (!"output_text".equals(content.path("type").asText())) continue;
                outputText = content.path("text").asText();
                for (JsonNode annotation : content.path("annotations")) {
                    if (!"url_citation".equals(annotation.path("type").asText())) continue;
                    validHttpsUrl(annotation.path("url").asText()).ifPresent(url -> annotations.add(new RawCitation(
                            Math.max(0, annotation.path("start_index").asInt()),
                            Math.max(0, annotation.path("end_index").asInt()),
                            url,
                            cleanTitle(annotation.path("title").asText(), url)
                    )));
                }
            }
        }
        if (outputText == null || outputText.isBlank()) {
            throw new IllegalStateException("OpenAI 응답에 텍스트가 없습니다.");
        }

        JsonNode structured = objectMapper.readTree(outputText);
        String answer = structured.path("answer").asText().trim();
        Map<String, String> modelTiers = sourceClassifications(structured.path("sourceClassifications"));
        CitationProjection projection = projectCitations(outputText, answer, annotations, consultedUrls, modelTiers);
        return new ParsedResponse(
                projection.answer(),
                stringArray(structured.path("suggestedReplies"), 3, 80),
                validatedEvidenceRefs(structured.path("evidenceRefs"), context),
                projection.sources()
        );
    }

    private CitationProjection projectCitations(String rawJson, String answer, List<RawCitation> annotations,
                                                  Set<String> consultedUrls, Map<String, String> modelTiers) {
        if (annotations.isEmpty()) {
            return new CitationProjection(OPENAI_CITATION_MARKER.matcher(answer).replaceAll("").trim(), List.of());
        }

        AnswerMapping mapping = answerMapping(rawJson, answer);
        Map<String, WebSourceView> sourceByUrl = new LinkedHashMap<>();
        List<CitationEdit> edits = new ArrayList<>();
        for (RawCitation annotation : annotations) {
            if (!consultedUrls.isEmpty() && !consultedUrls.contains(annotation.url())) {
                log.debug("Citation URL was not present in included search sources: {}", annotation.url());
            }
            WebSourceView source = sourceByUrl.computeIfAbsent(annotation.url(), url -> {
                int order = sourceByUrl.size() + 1;
                return new WebSourceView(
                        "S-" + order,
                        annotation.title(),
                        url,
                        classifySource(url, annotation.title(), requestedTier(url, modelTiers))
                );
            });
            if (mapping == null) continue;
            Integer start = mapping.decodedBoundary(annotation.startIndex());
            Integer end = mapping.decodedBoundary(annotation.endIndex());
            if (start == null || end == null || start < 0 || end < start || end > answer.length()) continue;
            int displayNumber = Integer.parseInt(source.ref().substring(2));
            String marker = "[" + displayNumber + "](" + markdownUrl(source.url()) + ")";
            String annotatedText = answer.substring(start, end);
            if (looksLikeCitationMarker(annotatedText)) edits.add(new CitationEdit(start, end, marker));
            else edits.add(new CitationEdit(end, end, " " + marker));
        }

        String projected = applyEdits(answer, edits);
        projected = OPENAI_CITATION_MARKER.matcher(projected).replaceAll("").trim();
        List<WebSourceView> sources = new ArrayList<>(sourceByUrl.values());
        if (!sources.isEmpty() && edits.isEmpty()) {
            projected = projected + "\n\n**확인한 출처** " + sources.stream()
                    .map(source -> "[" + source.ref().substring(2) + "](" + markdownUrl(source.url()) + ")")
                    .reduce((left, right) -> left + " · " + right).orElse("");
        }
        return new CitationProjection(projected, sources);
    }

    private AnswerMapping answerMapping(String rawJson, String expectedAnswer) {
        Matcher matcher = ANSWER_FIELD.matcher(rawJson);
        if (!matcher.find()) return null;
        int rawStart = matcher.end();
        List<Integer> rawBoundaries = new ArrayList<>();
        List<Integer> decodedBoundaries = new ArrayList<>();
        StringBuilder decoded = new StringBuilder();
        int index = rawStart;
        addBoundary(rawBoundaries, decodedBoundaries, index, 0);
        while (index < rawJson.length()) {
            char current = rawJson.charAt(index);
            if (current == '"') break;
            if (current != '\\') {
                decoded.append(current);
                index++;
                addBoundary(rawBoundaries, decodedBoundaries, index, decoded.length());
                continue;
            }
            if (index + 1 >= rawJson.length()) return null;
            char escaped = rawJson.charAt(index + 1);
            if (escaped == 'u' && index + 5 < rawJson.length()) {
                try {
                    decoded.append((char) Integer.parseInt(rawJson.substring(index + 2, index + 6), 16));
                    index += 6;
                    addBoundary(rawBoundaries, decodedBoundaries, index, decoded.length());
                    continue;
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
            decoded.append(switch (escaped) {
                case '"' -> '"';
                case '\\' -> '\\';
                case '/' -> '/';
                case 'b' -> '\b';
                case 'f' -> '\f';
                case 'n' -> '\n';
                case 'r' -> '\r';
                case 't' -> '\t';
                default -> escaped;
            });
            index += 2;
            addBoundary(rawBoundaries, decodedBoundaries, index, decoded.length());
        }
        if (!decoded.toString().equals(expectedAnswer)) return null;
        return new AnswerMapping(rawBoundaries, decodedBoundaries);
    }

    private void addBoundary(List<Integer> raw, List<Integer> decoded, int rawValue, int decodedValue) {
        raw.add(rawValue);
        decoded.add(decodedValue);
    }

    private String applyEdits(String answer, List<CitationEdit> edits) {
        if (edits.isEmpty()) return answer;
        StringBuilder value = new StringBuilder(answer);
        edits.stream()
                .distinct()
                .sorted(Comparator.comparingInt(CitationEdit::start).reversed())
                .forEach(edit -> value.replace(edit.start(), edit.end(), edit.replacement()));
        return value.toString();
    }

    private boolean looksLikeCitationMarker(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        return value.indexOf('\uE200') >= 0 || lower.contains("cite") || lower.contains("http")
                || (value.startsWith("[") && value.endsWith("]"));
    }

    private Map<String, String> sourceClassifications(JsonNode node) {
        Map<String, String> result = new LinkedHashMap<>();
        if (!node.isArray()) return result;
        for (JsonNode item : node) {
            String tier = item.path("tier").asText().toUpperCase(Locale.ROOT);
            if (!SOURCE_TIERS.contains(tier)) continue;
            validHttpsUrl(item.path("url").asText()).ifPresent(url -> result.putIfAbsent(url, tier));
        }
        return result;
    }

    private String requestedTier(String citationUrl, Map<String, String> modelTiers) {
        String exact = modelTiers.get(citationUrl);
        if (exact != null) return exact;
        String citationKey = canonicalSourceKey(citationUrl);
        return modelTiers.entrySet().stream()
                .filter(entry -> canonicalSourceKey(entry.getKey()).equals(citationKey))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElse(null);
    }

    private String canonicalSourceKey(String value) {
        try {
            URI uri = URI.create(value);
            String path = uri.getPath() == null ? "" : uri.getPath().replaceAll("/+$", "");
            return uri.getScheme().toLowerCase(Locale.ROOT) + "://"
                    + uri.getHost().toLowerCase(Locale.ROOT) + path;
        } catch (Exception ignored) {
            return value;
        }
    }

    private String classifySource(String url, String title, String modelTier) {
        String host = URI.create(url).getHost().toLowerCase(Locale.ROOT);
        String lowerTitle = title.toLowerCase(Locale.ROOT);
        if (isResearchSource(host)) return "P3";
        if (isPublicAuthority(host)) return "P2";
        if ("P1".equals(modelTier) && !looksSupplementary(host, lowerTitle)) return "P1";
        return "P4";
    }

    private boolean isPublicAuthority(String host) {
        return host.endsWith(".go.kr") || host.endsWith(".gov") || host.contains("mfds.go.kr")
                || host.equals("who.int") || host.endsWith(".who.int") || host.contains("europa.eu");
    }

    private boolean isResearchSource(String host) {
        return host.contains("pubmed.ncbi.nlm.nih.gov") || host.equals("doi.org") || host.endsWith(".doi.org")
                || host.contains("clinicaltrials.gov") || host.contains("cochranelibrary.com")
                || host.contains("sciencedirect.com") || host.contains("springer.com")
                || host.contains("nature.com") || host.contains("wiley.com")
                || host.contains("tandfonline.com") || host.contains("mdpi.com");
    }

    private boolean looksSupplementary(String host, String title) {
        return host.contains("blog") || host.contains("reddit") || host.contains("youtube")
                || host.contains("amazon") || host.contains("oliveyoung") || host.contains("shopping")
                || title.contains("후기") || title.contains("리뷰") || title.contains("review");
    }

    private java.util.Optional<String> validHttpsUrl(String value) {
        try {
            if (value == null || value.isBlank() || value.length() > 2000) return java.util.Optional.empty();
            URI uri = URI.create(value.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) return java.util.Optional.empty();
            return java.util.Optional.of(uri.toASCIIString());
        } catch (Exception ignored) {
            return java.util.Optional.empty();
        }
    }

    private String cleanTitle(String value, String url) {
        String title = value == null ? "" : value.trim();
        if (title.isBlank()) title = URI.create(url).getHost();
        return title.length() <= 180 ? title : title.substring(0, 180);
    }

    private String markdownUrl(String url) {
        return url.replace("(", "%28").replace(")", "%29").replace(" ", "%20");
    }

    private List<String> stringArray(JsonNode node, int limit, int maxLength) {
        List<String> values = new ArrayList<>();
        if (!node.isArray()) return values;
        for (JsonNode item : node) {
            String value = item.asText().trim();
            if (!value.isBlank() && value.length() <= maxLength && !values.contains(value)) values.add(value);
            if (values.size() == limit) break;
        }
        return values;
    }

    private List<String> validatedEvidenceRefs(JsonNode node, String context) {
        Set<String> allowed = new LinkedHashSet<>();
        Matcher matcher = EVIDENCE_REF.matcher(context);
        while (matcher.find()) allowed.add(matcher.group());
        return stringArray(node, 8, 64).stream().filter(allowed::contains).toList();
    }

    private String normalizedSearchContextSize() {
        String value = properties.webSearchContextSize();
        return Set.of("low", "medium", "high").contains(value) ? value : "low";
    }

    private boolean waitBeforeRetry(RestClientResponseException error) {
        long delayMillis = 500;
        if (error.getStatusCode().value() == 429) {
            String retryAfter = error.getResponseHeaders() == null
                    ? null : error.getResponseHeaders().getFirst("Retry-After");
            delayMillis = parseRetryMillis(retryAfter, error.getResponseBodyAsString());
        }
        try {
            Thread.sleep(Math.min(delayMillis, 25_000));
            return true;
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private long parseRetryMillis(String retryAfter, String responseBody) {
        if (retryAfter != null) {
            try {
                return Math.max(500, (long) (Double.parseDouble(retryAfter) * 1000));
            } catch (NumberFormatException ignored) {
                // OpenAI 오류 본문의 초 단위 안내로 이어서 확인한다.
            }
        }
        Matcher matcher = RETRY_SECONDS.matcher(responseBody == null ? "" : responseBody);
        if (matcher.find()) {
            try {
                return Math.max(500, (long) (Double.parseDouble(matcher.group(1)) * 1000) + 250);
            } catch (NumberFormatException ignored) {
                return 1_000;
            }
        }
        return 1_000;
    }

    private AiResult fallback(String mode) {
        List<String> suggestions = switch (mode) {
            case "PRODUCT" -> List.of("현재 루틴과 겹치는 점은?", "비슷한 내 기록 보여줘", "정보가 부족한 건 뭐야?");
            case "RECOMMEND" -> List.of("1번 후보를 더 자세히 볼래", "세 후보의 차이를 비교해줘", "내 기록이 부족한 부분은 뭐야?");
            case "PATTERN" -> List.of("반대 기록도 보여줘", "이 패턴은 얼마나 반복됐어?", "다음 탐색에 어떻게 써?");
            case "RESCUE" -> List.of("기록된 변경점만 보여줘", "나중에 다시 이어갈게");
            default -> List.of("내 최근 기록 보여줘", "다시 시도해줘");
        };
        return new AiResult(
                "AI 연결이 잠시 원활하지 않아요. 입력과 기록은 그대로 저장했습니다. 잠시 후 같은 대화에서 다시 시도할 수 있어요.",
                "FALLBACK",
                suggestions,
                List.of(),
                List.of()
        );
    }

    private RoutineIdentityResult routineIdentityFallback() {
        return new RoutineIdentityResult("", "", List.of(), "FALLBACK",
                properties.model() == null ? "unconfigured" : properties.model());
    }

    public record AiResult(String text, String status, List<String> suggestedReplies,
                           List<String> evidenceRefs, List<WebSourceView> webSources) {}

    public record RoutineIdentityResult(String name, String insight, List<String> keywords,
                                        String status, String model) {}

    record ParsedResponse(String answer, List<String> suggestedReplies, List<String> evidenceRefs,
                          List<WebSourceView> webSources) {}

    private record RawCitation(int startIndex, int endIndex, String url, String title) {}
    private record CitationEdit(int start, int end, String replacement) {}
    private record CitationProjection(String answer, List<WebSourceView> sources) {}

    private record AnswerMapping(List<Integer> rawBoundaries, List<Integer> decodedBoundaries) {
        Integer decodedBoundary(int rawIndex) {
            int found = java.util.Collections.binarySearch(rawBoundaries, rawIndex);
            return found < 0 ? null : decodedBoundaries.get(found);
        }
    }
}
