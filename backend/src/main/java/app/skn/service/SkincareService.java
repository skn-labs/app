package app.skn.service;

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

    public SkincareService(SkincareRepository repository) {
        this.repository = repository;
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

        Integer cursorOwned = null;
        Long cursorId = null;
        if (cursor != null && !cursor.isBlank()) {
            String[] parts = cursor.split(":", -1);
            try {
                if (parts.length != 2) throw new NumberFormatException();
                cursorOwned = Integer.valueOf(parts[0]);
                cursorId = Long.valueOf(parts[1]);
                if ((cursorOwned != 0 && cursorOwned != 1) || cursorId < 1) throw new NumberFormatException();
            } catch (NumberFormatException error) {
                throw ApiException.invalid("INVALID_PRODUCT_CURSOR", "제품 목록을 처음부터 다시 불러와주세요.");
            }
        }

        List<ProductView> fetched = repository.findProductsPage(normalizedQuery, cursorOwned, cursorId, limit + 1);
        boolean hasMore = fetched.size() > limit;
        List<ProductView> items = hasMore ? fetched.subList(0, limit) : fetched;
        ProductView last = items.isEmpty() ? null : items.get(items.size() - 1);
        String nextCursor = hasMore && last != null ? (last.owned() ? "1:" : "0:") + last.id() : null;
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

    private String routineDayPart(List<RoutineItemInput> items) {
        boolean morning = items.stream().anyMatch(item -> item.timeSlot().equals("MORNING") || item.timeSlot().equals("BOTH"));
        boolean evening = items.stream().anyMatch(item -> item.timeSlot().equals("EVENING") || item.timeSlot().equals("BOTH"));
        if (morning && !evening) return "MORNING";
        if (evening && !morning) return "EVENING";
        return "ANYTIME";
    }
}
