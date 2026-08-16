package app.skn.service;

import app.skn.ai.OpenAiGateway;
import app.skn.api.ApiModels.*;
import app.skn.common.ApiException;
import app.skn.data.SkincareRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class SkincareService {
    private static final Set<String> SENTIMENTS = Set.of("LIKED", "DISAPPOINTED", "UNSURE");
    private static final Set<String> DISCOMFORT = Set.of("NOT_REPORTED", "REPORTED", "UNKNOWN");
    private static final Set<String> ADHERENCE = Set.of("MATCHED", "PARTIAL", "DIFFERENT", "UNKNOWN");
    private static final Set<String> DAY_PARTS = Set.of("MORNING", "EVENING", "ANYTIME");
    private static final Set<String> TIME_SLOTS = Set.of("MORNING", "EVENING", "BOTH");

    private final SkincareRepository repository;
    private final OpenAiGateway openAi;

    public SkincareService(SkincareRepository repository, OpenAiGateway openAi) {
        this.repository = repository;
        this.openAi = openAi;
    }

    public HomeView home() {
        ExperienceView current = repository.findActiveExperience().orElse(null);
        return new HomeView(
                repository.displayName(),
                current,
                repository.findPatterns().stream().limit(2).toList(),
                repository.productCount(),
                repository.recordCount(),
                current == null ? "START_EXPERIENCE" : current.reviewDue() ? "REVIEW_EXPERIENCE" : "RECORD_EXPERIENCE"
        );
    }

    public NotificationInboxView notifications() {
        return repository.findNotificationInbox();
    }

    @Transactional
    public NotificationView readNotification(long notificationId) {
        return repository.markNotificationRead(notificationId);
    }

    @Transactional
    public NotificationView snoozeNotification(long notificationId, SnoozeNotificationRequest request) {
        return repository.snoozeNotification(notificationId, request.durationHours());
    }

    @Transactional
    public ApiMessage readAllNotifications() {
        repository.markAllNotificationsRead();
        return new ApiMessage("현재 도착한 알림을 모두 읽음으로 표시했어요.");
    }

    public List<ProductView> products(String query) {
        return repository.findProducts(query);
    }

    public ProductPageView productPage(String query, String cursor, int limit) {
        String normalizedQuery = query == null ? "" : query.trim();
        if (normalizedQuery.length() > 100) {
            throw ApiException.invalid("PRODUCT_QUERY_TOO_LONG", "검색어는 100자 이하로 입력해주세요.");
        }
        if (limit < 1 || limit > 50) {
            throw ApiException.invalid("INVALID_PRODUCT_PAGE_SIZE", "한 번에 1개에서 50개까지 불러올 수 있어요.");
        }

        long cursorOffset = 0;
        if (cursor != null && !cursor.isBlank()) {
            String[] parts = cursor.split(":", -1);
            try {
                if (parts.length != 2 || !"o".equals(parts[0])) throw new NumberFormatException();
                cursorOffset = Long.parseLong(parts[1]);
                if (cursorOffset < 0 || cursorOffset > 1_000_000) throw new NumberFormatException();
            } catch (NumberFormatException error) {
                throw ApiException.invalid("INVALID_PRODUCT_CURSOR", "제품 목록을 처음부터 다시 불러와주세요.");
            }
        }

        List<ProductView> fetched = repository.findProductsPage(normalizedQuery, cursorOffset, limit + 1);
        boolean hasMore = fetched.size() > limit;
        List<ProductView> items = hasMore ? fetched.subList(0, limit) : fetched;
        String nextCursor = hasMore && !items.isEmpty() ? "o:" + (cursorOffset + items.size()) : null;
        return new ProductPageView(List.copyOf(items), nextCursor, hasMore);
    }

    public ProductView product(long id) {
        return repository.findProduct(id).orElseThrow(() -> ApiException.notFound("제품을 찾을 수 없어요."));
    }

    public List<UserProductView> userProducts() {
        return repository.findUserProducts();
    }

    public UserProductView userProduct(long id) {
        return repository.findUserProduct(id).orElseThrow(() -> ApiException.notFound("내 화장품에서 제품을 찾을 수 없어요."));
    }

    @Transactional
    public UserProductView addUserProduct(AddUserProductRequest request) {
        if (request.productId() != null) {
            if (request.customName() != null && !request.customName().isBlank()) {
                throw ApiException.invalid("PRODUCT_REFERENCE_CONFLICT", "카탈로그 제품과 직접 입력 제품 중 하나만 선택해주세요.");
            }
            repository.findProduct(request.productId())
                    .orElseThrow(() -> ApiException.notFound("등록할 카탈로그 제품을 찾을 수 없어요."));
            return repository.findOwnedCatalogProduct(request.productId()).orElseGet(() -> {
                long id = repository.insertCatalogUserProduct(request.productId(), request.memo());
                return userProduct(id);
            });
        }
        if (request.customName() == null || request.customName().isBlank()) {
            throw ApiException.invalid("PRODUCT_NAME_REQUIRED", "검색 결과가 없다면 제품명을 입력해주세요.");
        }
        long id = repository.insertCustomUserProduct(
                request.customBrand(), request.customName(), request.customCategory(), request.memo());
        return userProduct(id);
    }

    public RoutineView currentRoutine() {
        return repository.findCurrentRoutine().orElseThrow(() -> ApiException.notFound("현재 루틴이 없어요."));
    }

    public RoutineView baselineRoutine() {
        return repository.findBaselineRoutine().orElseThrow(() -> ApiException.notFound("아직 비교 기준 루틴이 없어요."));
    }

    public RoutineView routine(long routineId) {
        return repository.findRoutine(routineId).orElseThrow(() -> ApiException.notFound("루틴을 찾을 수 없어요."));
    }

    @Transactional
    public ExperienceView startExperience(StartExperienceRequest request) {
        var existing = repository.findSessionIdByClientRequest(request.clientRequestId());
        if (existing.isPresent()) return experience(existing.get());

        UserProductView selected = userProduct(request.userProductId());
        String mode = request.mode().trim().toUpperCase(Locale.ROOT);
        String dayPart = normalizeDayPart(request.dayPart());
        repository.closeActiveExperience("NEW_EXPERIENCE_STARTED");

        long sessionId;
        if (mode.equals("PRODUCT")) {
            sessionId = repository.insertExperienceSession(
                    "PRODUCT", null, selected.id(), selected.displayName(), request.clientRequestId());
        } else if (mode.equals("ROUTINE")) {
            RoutineView current = repository.findCurrentRoutine().orElse(null);
            List<RoutineItemInput> items = current == null
                    ? new ArrayList<>() : new ArrayList<>(repository.findRoutineItemInputs(current.id()));
            Long routineId;
            if (items.stream().anyMatch(item -> item.userProductId().equals(selected.id())) && current != null) {
                routineId = current.id();
            } else {
                items.add(new RoutineItemInput(selected.id(), dayPart.equals("ANYTIME") ? "BOTH" : dayPart, "매일"));
                if (current != null) repository.archiveCurrentRoutine();
                routineId = repository.insertRoutine(
                        selected.displayName() + "을 더한 " + dayPartLabel(dayPart) + " 루틴",
                        current == null ? dayPart : "ANYTIME",
                        current == null ? null : current.id(),
                        items
                );
            }
            sessionId = repository.insertExperienceSession(
                    "ROUTINE", routineId, null,
                    selected.displayName() + "을 더한 " + dayPartLabel(dayPart) + " 루틴",
                    request.clientRequestId());
        } else {
            throw ApiException.invalid("INVALID_EXPERIENCE_MODE", "기존 루틴에 더할지 제품 하나만 써볼지 선택해주세요.");
        }
        return experience(sessionId);
    }

    @Transactional
    public ExperienceView replaceRoutine(UpdateRoutineRequest request, String clientRequestId) {
        if (clientRequestId == null || clientRequestId.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CLIENT_REQUEST_ID_REQUIRED", "요청 식별자가 필요해요.");
        }
        var existing = repository.findSessionIdByClientRequest(clientRequestId);
        if (existing.isPresent()) return experience(existing.get());

        List<RoutineItemInput> items = new ArrayList<>();
        Set<Long> seen = new LinkedHashSet<>();
        for (RoutineItemInput item : request.items()) {
            if (!seen.add(item.userProductId())) continue;
            userProduct(item.userProductId());
            String timeSlot = normalize(item.timeSlot(), TIME_SLOTS, "INVALID_TIME_SLOT");
            String frequency = item.frequency().trim();
            if (frequency.isBlank()) throw ApiException.invalid("INVALID_FREQUENCY", "사용 빈도를 입력해주세요.");
            items.add(new RoutineItemInput(item.userProductId(), timeSlot, frequency));
        }
        if (items.isEmpty() || items.size() > 12) {
            throw ApiException.invalid("INVALID_ROUTINE_SIZE", "루틴에는 1개부터 12개까지 넣을 수 있어요.");
        }
        RoutineView current = repository.findCurrentRoutine().orElse(null);
        repository.closeActiveExperience("ROUTINE_CHANGED");
        if (current != null) repository.archiveCurrentRoutine();
        long routineId = repository.insertRoutine(
                request.name().trim(), routineDayPart(items), current == null ? null : current.id(), items);
        long sessionId = repository.insertExperienceSession(
                "ROUTINE", routineId, null, request.name().trim(), clientRequestId);
        return experience(sessionId);
    }

    public RoutineNameSuggestionView suggestRoutineName(long routineId) {
        RoutineView routine = routine(routineId);
        String fallback = fallbackRoutineName(routine);
        String context = routine.items().stream()
                .sorted(java.util.Comparator.comparingInt(RoutineItemView::position))
                .map(item -> "%d. %s / %s / %s".formatted(
                        item.position(), item.category(),
                        timeSlotLabel(item.timeSlot()), item.frequency()))
                .collect(java.util.stream.Collectors.joining("\n"));
        var result = openAi.answer(
                "ROUTINE_NAME",
                """
                당신은 SKN의 루틴 이름을 짓는 에디터다. 이름만 읽어도 사용자가
                이 루틴의 특징을 바로 떠올릴 수 있는 자연스러운 한국어 제목을 만든다.

                이름을 정하기 전에 서로 다른 후보를 내부적으로 다섯 개 만든 뒤 가장 좋은 하나만 고른다.
                - 서버가 제공한 제품 종류, 순서, 사용 시간과 빈도만 근거로 사용한다.
                - 브랜드명, 전체 제품명, 성분명과 제품명에서 가져온 수식어를 이름에 쓰지 않는다.
                - 브랜드 이름처럼 추상적으로 작명하지 말고 실제 구성을 한 문장처럼 요약한다.
                - 가장 기억하기 쉬운 특징 하나만 고른다. 같은 종류의 제품 수, 마지막 단계,
                  다른 사용 빈도, 첫 단계와 마지막 단계 순으로 살핀다.
                - 아래 문장 구조를 우선하되 입력에 실제 근거가 있을 때만 쓴다.
                  세럼 2개를 더한 저녁 루틴
                  선크림으로 마치는 아침 루틴
                  앰플을 주 3회 더하는 저녁 루틴
                  클렌저부터 크림까지 쓰는 저녁 루틴
                  매일 쓰는 저녁 루틴
                - 제품 종류는 세럼, 앰플, 토너, 크림, 클렌저, 선크림처럼 사용자가 바로 알아보는 말로 쓴다.
                - 가급적 12~28자 안에서 끝내고, 조사와 어순을 자연스럽게 쓴다.

                나만의, 완벽한, 빛나는, 기적, 시크릿, 프리미엄, 맞춤, 꿀피부 같은 광고성 표현을 쓰지 않는다.
                레이어, 리듬, 페어처럼 뜻을 한 번 더 해석해야 하는 추상적인 조어를 쓰지 않는다.
                제품 총개수나 N단계를 이름의 중심으로 쓰지 않는다. 같은 종류가 반복되는 특징을 설명할 때만 개수를 쓴다.
                피부 타입, 효능, 안전성, 원인, 결과나 적합성을 추론하지 않는다.
                따옴표, 설명, 접두어, 마침표, 이모지를 쓰지 않고 최종 이름 한 줄만 출력한다.
                """,
                context,
                "사용자가 이름만 보고 실제 구성을 이해할 수 있는 가장 자연스러운 제목 하나를 정해줘."
        );
        boolean aiGenerated = "READY".equals(result.status());
        return new RoutineNameSuggestionView(
                aiGenerated ? cleanRoutineName(result.text(), fallback) : fallback,
                aiGenerated
        );
    }

    @Transactional
    public RoutineView renameCurrentRoutine(long routineId, RenameRoutineRequest request) {
        RoutineView routine = routine(routineId);
        if (!"CURRENT".equals(routine.status())) {
            throw ApiException.conflict("ROUTINE_NOT_CURRENT", "현재 사용 중인 루틴의 이름만 바꿀 수 있어요.");
        }
        String name = request.name().trim();
        if (!repository.renameCurrentRoutine(routineId, name)) {
            throw ApiException.conflict("ROUTINE_CHANGED", "루틴이 이미 변경됐어요. 현재 루틴을 다시 확인해주세요.");
        }
        return routine(routineId);
    }

    public ExperienceView activeExperience() {
        return repository.findActiveExperience().orElseThrow(() -> ApiException.notFound("현재 사용 중인 경험이 없어요."));
    }

    public ExperienceView experience(long id) {
        return repository.findExperience(id).orElseThrow(() -> ApiException.notFound("사용 경험을 찾을 수 없어요."));
    }

    public List<ExperienceRecordView> records() {
        return repository.findExperienceRecords();
    }

    @Transactional
    public SavedExperienceRecord record(long sessionId, RecordExperienceRequest request) {
        var duplicate = repository.findRecordIdByClientRequest(request.clientRequestId());
        if (duplicate.isPresent()) {
            ExperienceRecordView record = repository.findExperienceRecord(duplicate.get()).orElseThrow();
            return new SavedExperienceRecord(record, null, rescueSuggested(record.discomfort(), record.note()));
        }

        ExperienceView session = experience(sessionId);
        if (!session.status().equals("ACTIVE")) {
            throw ApiException.conflict("EXPERIENCE_CLOSED", "이미 마친 경험에는 새 기록을 추가할 수 없어요.");
        }
        String sentiment = normalize(request.sentiment(), SENTIMENTS, "INVALID_SENTIMENT");
        String discomfort = normalize(request.discomfort(), DISCOMFORT, "INVALID_DISCOMFORT");
        String adherence = normalize(request.adherence() == null ? "MATCHED" : request.adherence(), ADHERENCE, "INVALID_ADHERENCE");
        String note = request.note() == null ? "" : request.note().trim();
        List<String> tags = request.tags() == null ? List.of() : request.tags().stream()
                .filter(tag -> tag != null && !tag.isBlank()).map(String::trim)
                .filter(tag -> tag.length() <= 24).distinct().limit(8).toList();
        Long userProductId = session.subjectType().equals("PRODUCT") ? session.userProductId() : null;
        long recordId = repository.insertExperienceRecord(
                sessionId, userProductId, sentiment, note, discomfort, adherence,
                request.clientRequestId(), tags);
        if (session.reviewDue()) {
            repository.completeExperience(sessionId, "REVIEW_SUBMITTED");
            if (session.routineId() != null && !"REPORTED".equals(discomfort)) {
                repository.promoteComparisonBaseline(session.routineId(), recordId);
            }
        }
        Long linkedPatternId = repository.connectRecordToPattern(recordId, tags, sentiment);
        ExperienceRecordView saved = repository.findExperienceRecord(recordId).orElseThrow();
        return new SavedExperienceRecord(saved, linkedPatternId, rescueSuggested(discomfort, note));
    }

    @Transactional
    public ApiMessage completeExperience(long sessionId) {
        ExperienceView session = experience(sessionId);
        if (!session.status().equals("ACTIVE")) return new ApiMessage("이미 마친 경험이에요.");
        repository.completeExperience(sessionId, "USER_ENDED");
        return new ApiMessage("이 경험을 마쳤어요. 기록은 그대로 남아 다음 탐색에 사용됩니다.");
    }

    public List<PatternView> patterns() {
        return repository.findPatterns();
    }

    public PatternView pattern(long id) {
        return repository.findPattern(id).orElseThrow(() -> ApiException.notFound("패턴을 찾을 수 없어요."));
    }

    private String normalize(String value, Set<String> allowed, String code) {
        if (value == null) throw ApiException.invalid(code, "필수 선택값이 빠졌어요.");
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(normalized)) throw ApiException.invalid(code, "지원하지 않는 선택값이에요.");
        return normalized;
    }

    private String normalizeDayPart(String dayPart) {
        return normalize(dayPart == null ? "EVENING" : dayPart, DAY_PARTS, "INVALID_DAY_PART");
    }

    private boolean rescueSuggested(String discomfort, String note) {
        if ("REPORTED".equals(discomfort)) return true;
        String value = note == null ? "" : note;
        return List.of("따가", "붉", "가렵", "화끈", "트러블", "뾰루지", "아프").stream().anyMatch(value::contains);
    }

    private String dayPartLabel(String dayPart) {
        return switch (dayPart) {
            case "MORNING" -> "아침";
            case "ANYTIME" -> "수시";
            default -> "저녁";
        };
    }

    private String timeSlotLabel(String timeSlot) {
        return switch (timeSlot) {
            case "MORNING" -> "아침";
            case "BOTH" -> "아침과 저녁";
            default -> "저녁";
        };
    }

    private String fallbackRoutineName(RoutineView routine) {
        if (routine.items().size() == 1) {
            String category = routine.items().get(0).category().trim();
            return switch (routine.dayPart()) {
                case "MORNING" -> "아침 " + category + " 루틴";
                case "EVENING" -> "저녁 " + category + " 루틴";
                default -> "아침·저녁 " + category + " 루틴";
            };
        }
        return switch (routine.dayPart()) {
            case "MORNING" -> "아침에 쓰는 루틴";
            case "EVENING" -> "저녁에 쓰는 루틴";
            default -> "아침과 저녁에 쓰는 루틴";
        };
    }

    private String cleanRoutineName(String value, String fallback) {
        if (value == null) return fallback;
        String clean = value.lines().findFirst().orElse("")
                .replaceAll("^[\\s\\\"'`‘’“”]+|[\\s\\\"'`‘’“”.。]+$", "")
                .replaceFirst("^(루틴 이름|이름|제안)\\s*[:：-]\\s*", "")
                .trim();
        if (clean.isBlank()) return fallback;
        return truncateRoutineName(clean);
    }

    private String truncateRoutineName(String value) {
        String clean = value.trim();
        return clean.length() <= 40 ? clean : clean.substring(0, 40).trim();
    }

    private String routineDayPart(List<RoutineItemInput> items) {
        boolean morning = items.stream().anyMatch(item -> item.timeSlot().equals("MORNING") || item.timeSlot().equals("BOTH"));
        boolean evening = items.stream().anyMatch(item -> item.timeSlot().equals("EVENING") || item.timeSlot().equals("BOTH"));
        if (morning && !evening) return "MORNING";
        if (evening && !morning) return "EVENING";
        return "ANYTIME";
    }
}
