package app.skn.service;

import app.skn.ai.OpenAiGateway;
import app.skn.ai.OpenAiGateway.AiResult;
import app.skn.ai.PromptFactory;
import app.skn.api.ApiModels.*;
import app.skn.common.ApiException;
import app.skn.data.SkincareRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ConversationService {
    private static final Set<String> MODES = Set.of("GENERAL", "PRODUCT", "RECOMMEND", "PATTERN", "RESCUE");

    private final SkincareRepository repository;
    private final SkincareService skincareService;
    private final OpenAiGateway openAi;
    private final PromptFactory prompts;

    public ConversationService(SkincareRepository repository, SkincareService skincareService,
                               OpenAiGateway openAi, PromptFactory prompts) {
        this.repository = repository;
        this.skincareService = skincareService;
        this.openAi = openAi;
        this.prompts = prompts;
    }

    public List<ConversationView> conversations() {
        return repository.findConversations();
    }

    public ConversationView conversation(long id) {
        repository.findConversationRow(id).orElseThrow(() -> ApiException.notFound("AI 대화를 찾을 수 없어요."));
        return repository.conversationView(id);
    }

    public ConversationView create(CreateConversationRequest request) {
        String mode = normalizeMode(request.mode());
        if (!mode.equals("RESCUE") && isRescueIntent(request.initialPrompt())) mode = "RESCUE";
        else if (!mode.equals("PRODUCT") && isRecommendationIntent(request.initialPrompt())) mode = "RECOMMEND";
        if (request.productId() != null) skincareService.product(request.productId());
        if (request.experienceId() != null) skincareService.experience(request.experienceId());

        long conversationId = repository.insertConversation(mode, request.productId(), request.experienceId());
        long userMessageId = repository.insertMessage(
                conversationId, "USER", request.initialPrompt().trim(), "READY",
                request.clientRequestId(), List.of());

        if (mode.equals("RESCUE")) {
            startRescue(conversationId, request.initialPrompt().trim(), userMessageId);
        } else {
            answerWithAi(conversationId, mode, request.initialPrompt(), userMessageId);
        }
        return conversation(conversationId);
    }

    public ConversationView send(long conversationId, SendMessageRequest request) {
        Map<String, Object> conversation = repository.findConversationRow(conversationId)
                .orElseThrow(() -> ApiException.notFound("AI 대화를 찾을 수 없어요."));
        var duplicate = repository.findMessageIdByClientRequest(conversationId, request.clientRequestId());
        if (duplicate.isPresent()) return conversation(conversationId);

        String mode = String.valueOf(conversation.get("mode"));
        String rescueStage = repository.findLatestAssistantClientRequestId(conversationId).orElse("");
        long userMessageId = repository.insertMessage(
                conversationId, "USER", request.text().trim(), "READY", request.clientRequestId(), List.of());

        if (!mode.equals("RESCUE") && isRescueIntent(request.text())) {
            repository.updateConversationMode(conversationId, "RESCUE");
            startRescue(conversationId, request.text().trim(), userMessageId);
        } else if (mode.equals("RESCUE")) {
            handleRescue(conversationId, request.text().trim(), userMessageId, rescueStage);
        } else if (!mode.equals("PRODUCT") && isRecommendationIntent(request.text())) {
            if (!mode.equals("RECOMMEND")) repository.updateConversationMode(conversationId, "RECOMMEND");
            answerWithAi(conversationId, "RECOMMEND", request.text().trim(), userMessageId);
        } else {
            answerWithAi(conversationId, mode, request.text().trim(), userMessageId);
        }
        return conversation(conversationId);
    }

    private void startRescue(long conversationId, String userMessage, long userMessageId) {
        if (isSevere(userMessage)) {
            blockRescue(conversationId, userMessageId);
            return;
        }
        repository.insertMessage(
                conversationId,
                "ASSISTANT",
                "불편했던 내용을 먼저 남겼어요. 원인을 단정하지 않고 기록된 변경부터 확인할게요. 지금 증상이 심하거나 빠르게 악화되고 있나요?",
                "READY",
                "rescue-safety-" + userMessageId,
                List.of("심하거나 빠르게 악화되진 않아요", "잘 모르겠어요", "빠르게 심해지고 있어요")
        );
    }

    private void handleRescue(long conversationId, String userMessage, long userMessageId, String rescueStage) {
        if (isSevere(userMessage)) {
            blockRescue(conversationId, userMessageId);
            return;
        }

        if (rescueStage.startsWith("rescue-safety-")) {
            if (isUnknown(userMessage)) {
                AiResult result = openAi.answer(
                        "RESCUE", prompts.instructions("RESCUE"),
                        rescueContext(conversationId, "SAFETY_UNKNOWN"),
                        "사용자가 증상이 심하거나 빠르게 악화되는지 잘 모르겠다고 답했다. 진단하지 말고, 제품 분석을 계속하기 전에 사용자가 스스로 답할 수 있는 짧은 확인 질문 하나만 하라.",
                        false
                );
                result = rescueFallbackIfNeeded(conversationId, result, "SAFETY_UNKNOWN");
                saveAi(conversationId, userMessageId, result, "rescue-safety-");
                return;
            }
            AiResult result = openAi.answer(
                    "RESCUE", prompts.instructions("RESCUE"),
                    rescueContext(conversationId, "SAFETY_CONTINUE"),
                    "안전 확인 뒤, 서버가 계산한 비교 기준과 현재 루틴의 변경을 사용자에게 보여주고 기록과 다른 변화가 있었는지 한 가지만 물어라.",
                    false
            );
            result = rescueFallbackIfNeeded(conversationId, result, "CHANGES");
            saveAi(conversationId, userMessageId, result, "rescue-changes-");
            return;
        }

        if (rescueStage.startsWith("rescue-changes-")) {
            if (!confirmsRecordedChanges(userMessage)) {
                AiResult result = openAi.answer(
                        "RESCUE", prompts.instructions("RESCUE"),
                        rescueContext(conversationId, "CHANGE_CORRECTION_NEEDED"),
                        userMessage + "\n사용자가 저장된 변경 목록과 다른 점을 말했거나 확인하지 않았다. 이 대화만으로 저장된 루틴 사실을 바꾸지 말고, 현재 저장된 변경만으로 계속할지 루틴을 먼저 고칠지 한 가지만 확인하라. 아직 확인 순서나 새 루틴을 제안하지 마라.",
                        false
                );
                result = rescueFallbackIfNeeded(conversationId, result, "CHANGE_CORRECTION");
                saveAi(conversationId, userMessageId, result, "rescue-changes-");
                return;
            }

            RescuePlanView existingPlan = repository.findRescuePlan(conversationId).orElse(null);
            if (existingPlan == null) createRescuePlan(conversationId);
            AiResult result = openAi.answer(
                    "RESCUE", prompts.instructions("RESCUE"),
                    rescueContext(conversationId, "PLAN_READY"),
                    userMessage + "\n서버가 계산한 확인 순서와 제안 루틴을 설명하되 특정 제품을 범인이라고 말하지 마라.",
                    true
            );
            result = rescueFallbackIfNeeded(conversationId, result, "PLAN");
            saveAi(conversationId, userMessageId, result, "rescue-plan-");
            return;
        }

        if (repository.findRescuePlan(conversationId).isPresent()) {
            answerWithAi(conversationId, "RESCUE", userMessage, userMessageId);
            return;
        }

        // 배포 전 생성된 Rescue 대화처럼 단계 표식이 없으면 안전 확인부터 다시 이어간다.
        startRescue(conversationId, userMessage, userMessageId);
    }

    private void blockRescue(long conversationId, long userMessageId) {
            repository.upsertRescuePlan(
                    conversationId, null, null, "제품 분석을 멈췄어요",
                    "빠르게 악화되거나 심하다는 표현이 있어 제품 순위와 루틴 제안을 제공하지 않습니다.", "BLOCKED");
            repository.insertMessage(
                    conversationId,
                    "ASSISTANT",
                    "빠르게 심해지고 있다는 말이 있어 제품 확인 순위와 루틴 제안은 여기서 멈출게요. SKN은 응급도나 질환을 판단하지 않습니다. 제품 분석보다 전문가에게 상태를 직접 확인받아 주세요. 입력과 현재 루틴은 그대로 보존했어요.",
                    "READY",
                    "rescue-blocked-" + userMessageId,
                    List.of("안내를 확인했어요", "기록은 그대로 남겨줘")
            );
    }

    private void createRescuePlan(long conversationId) {
        RoutineView current = repository.findCurrentRoutine().orElse(null);
        RoutineView baseline = repository.findBaselineRoutine().orElse(null);
        if (current == null) {
            repository.upsertRescuePlan(conversationId, null, null,
                    "현재 사용 조합을 먼저 알려주세요",
                    "저장된 현재 루틴이 없어 변경점을 계산하거나 새 루틴을 적용할 수 없습니다.", "BLOCKED");
            return;
        }
        List<Long> currentIds = repository.findRoutineUserProductIds(current.id());
        List<Long> baselineIds = baseline == null ? List.of() : repository.findRoutineUserProductIds(baseline.id());
        List<Long> changed = currentIds.stream().filter(id -> !baselineIds.contains(id)).toList();
        Long candidate = chooseCandidate(changed);
        if (candidate == null) {
            repository.upsertRescuePlan(conversationId, current.id(), null,
                    "기록된 변경이 충분하지 않아요",
                    "비교 기준 이후 추가된 제품을 찾지 못해 현재 루틴을 자동으로 바꾸지 않습니다.", "BLOCKED");
            return;
        }
        String name = skincareService.userProduct(candidate).displayName();
        repository.upsertRescuePlan(
                conversationId,
                current.id(),
                candidate,
                name + "을 잠시 뺀 루틴",
                "최근 함께 추가된 제품 중 과거 아쉬움 기록과 비교할 수 있는 항목을 먼저 확인합니다. 나머지 제품과 순서는 유지합니다.",
                "PROPOSED"
        );
    }

    private Long chooseCandidate(List<Long> changed) {
        if (changed.isEmpty()) return null;
        List<ExperienceRecordView> records = repository.findExperienceRecords();
        return changed.stream()
                .sorted((left, right) -> Integer.compare(candidateScore(right, records), candidateScore(left, records)))
                .findFirst().orElse(null);
    }

    private int candidateScore(Long userProductId, List<ExperienceRecordView> records) {
        return records.stream()
                .filter(record -> userProductId.equals(record.userProductId()))
                .mapToInt(record -> record.discomfort().equals("REPORTED") ? 4
                        : record.sentiment().equals("DISAPPOINTED") ? 2 : -1)
                .sum();
    }

    @Transactional
    public ExperienceView applyRescue(long conversationId, ApplyRescueRequest request) {
        RescuePlanView plan = repository.findRescuePlan(conversationId)
                .orElseThrow(() -> ApiException.invalid("RESCUE_PLAN_NOT_READY", "아직 적용할 루틴 제안이 없어요."));
        if (plan.appliedExperienceId() != null) return skincareService.experience(plan.appliedExperienceId());
        if (!plan.status().equals("PROPOSED") || plan.removeUserProductId() == null) {
            throw ApiException.invalid("RESCUE_PLAN_NOT_APPLICABLE", "이 Rescue에서는 루틴을 적용할 수 없어요.");
        }
        var duplicate = repository.findSessionIdByClientRequest(request.clientRequestId());
        if (duplicate.isPresent()) return skincareService.experience(duplicate.get());

        RoutineView current = repository.findCurrentRoutine()
                .orElseThrow(() -> ApiException.conflict("RESCUE_PLAN_STALE", "현재 루틴이 달라져 다시 확인해야 해요."));
        if (plan.baseRoutineId() == null || current.id() != plan.baseRoutineId()) {
            throw ApiException.conflict("RESCUE_PLAN_STALE", "제안 이후 현재 루틴이 달라져 다시 확인해야 해요.");
        }
        List<RoutineItemInput> nextItems = repository.findRoutineItemInputs(current.id()).stream()
                .filter(item -> !item.userProductId().equals(plan.removeUserProductId())).toList();
        if (nextItems.isEmpty()) throw ApiException.invalid("EMPTY_RESCUE_ROUTINE", "모든 제품을 뺀 루틴은 적용할 수 없어요.");

        repository.closeActiveExperience("RESCUE_APPLIED");
        repository.archiveCurrentRoutine();
        long routineId = repository.insertRoutine(
                plan.title(), current.dayPart(), current.id(), nextItems);
        long sessionId = repository.insertExperienceSession(
                "ROUTINE", routineId, null, plan.title(), request.clientRequestId());
        repository.markRescuePlanApplied(plan.id(), sessionId);
        return skincareService.experience(sessionId);
    }

    private void answerWithAi(long conversationId, String mode, String userMessage, long userMessageId) {
        AiResult result = openAi.answer(
                mode,
                prompts.instructions(mode),
                contextFor(conversationId, mode),
                userMessage,
                mode.equals("PRODUCT") || mode.equals("RECOMMEND")
                        || (mode.equals("RESCUE") && repository.findRescuePlan(conversationId).isPresent())
        );
        result = domainFallbackIfNeeded(conversationId, mode, result);
        saveAi(conversationId, userMessageId, result);
    }

    private AiResult domainFallbackIfNeeded(long conversationId, String mode, AiResult result) {
        if (!result.status().equals("FALLBACK")) return result;
        return switch (mode) {
            case "PRODUCT" -> productFallback(conversationId);
            case "RECOMMEND" -> recommendationFallback(conversationId);
            case "PATTERN" -> patternFallback();
            case "RESCUE" -> rescueFallback(conversationId, "PLAN");
            default -> generalFallback();
        };
    }

    private AiResult generalFallback() {
        RoutineView current = repository.findCurrentRoutine().orElse(null);
        List<ExperienceRecordView> records = repository.findExperienceRecords();
        List<String> evidence = new ArrayList<>();
        StringBuilder answer = new StringBuilder("지금 저장된 내 데이터로 바로 확인하면, ");
        if (current == null) {
            answer.append("**현재 루틴은 아직 없어요.**");
        } else {
            answer.append("현재 루틴은 **").append(current.name()).append("**이고, ")
                    .append(current.items().stream().map(RoutineItemView::productName).toList())
                    .append("을 사용 중이에요.");
            evidence.add("R-" + current.id());
        }
        if (records.isEmpty()) {
            answer.append(" 아직 남긴 사용 결과는 없어서 반복되는 취향이나 불편은 말할 수 없어요.");
        } else {
            ExperienceRecordView latest = records.get(0);
            answer.append("\n\n가장 최근 사용 결과는 **").append(latest.productName()).append("**에 남긴 “")
                    .append(latest.note()).append("”이고, 선택한 태그는 ").append(latest.tags()).append("예요.");
            evidence.add("E-" + latest.id());
        }
        return fallbackResult(answer.toString(),
                List.of("현재 루틴을 자세히 볼래", "최근 사용 결과를 더 보여줘"), evidence);
    }

    private AiResult productFallback(long conversationId) {
        Map<String, Object> row = repository.findConversationRow(conversationId).orElseThrow();
        Long productId = nullableLong(row.get("product_id"));
        if (productId == null) return generalFallback();
        ProductView product = skincareService.product(productId);
        String volume = product.volume() == null || product.volume().isBlank() ? "용량 정보 없음" : product.volume();
        StringBuilder answer = new StringBuilder("지금 확인한 제품은 **")
                .append(product.brand()).append(' ').append(product.name()).append("**이에요. ")
                .append(product.category()).append(" · ").append(volume).append("로 식별돼요.");
        if (!product.facts().isEmpty()) {
            answer.append("\n\n저장된 확인 정보는 ")
                    .append(product.facts().stream().limit(2).map(ProductFact::text).toList()).append("예요.");
        } else {
            answer.append("\n\n외부 자료를 확인하지 않은 상태에서는 성분·효과·적합성을 덧붙이지 않을게요.");
        }
        answer.append(" 내 화장품 등록은 **").append(product.owned() ? "되어 있고" : "아직 안 되어 있고")
                .append("**, 연결된 사용 결과는 **").append(product.personalRecordCount()).append("건**이에요.");
        return fallbackResult(answer.toString(),
                List.of("내 루틴과 겹치는지만 볼래", "이 제품 상세를 볼래"), List.of("P-" + product.id()));
    }

    private AiResult recommendationFallback(long conversationId) {
        List<ProductView> candidates = recommendationCandidates(conversationId);
        if (candidates.isEmpty()) {
            return fallbackResult(
                    "지금은 **추천할 수 있는 미보유 카탈로그 제품이 없어요.** 내 화장품을 정리하거나 새 제품을 카탈로그에 추가한 뒤 다시 비교할 수 있어요.",
                    List.of("내 화장품을 볼래", "제품을 검색할래"), List.of());
        }
        ProductView candidate = candidates.get(0);
        return fallbackResult(
                "지금 하나만 고르면 **%s %s**을 먼저 보세요.\n\n외부 제품 정보 확인이 잠시 지연돼 세부 특징이나 적합성은 덧붙이지 않았어요. 그래도 답을 비워두지 않고 서버가 고른 첫 번째 카탈로그 후보를 연결했습니다."
                        .formatted(candidate.brand(), candidate.name()),
                List.of("이 제품 상세를 볼래", "연결되면 근거까지 다시 확인해줘"),
                List.of("P-" + candidate.id())
        );
    }

    private AiResult patternFallback() {
        List<PatternView> patterns = repository.findPatterns();
        if (patterns.isEmpty()) {
            int recordCount = repository.recordCount();
            return fallbackResult(
                    "지금은 **반복 패턴으로 보여줄 근거가 없어요.** 사용 결과는 " + recordCount
                            + "건 저장돼 있지만, 비슷한 사용 결과가 반복되고 반대 경험도 함께 쌓여야 패턴으로 연결할 수 있어요.",
                    List.of("최근 사용 결과를 볼래", "새 기록을 남길래"), List.of());
        }
        List<PatternView> visible = patterns.stream().limit(2).toList();
        String details = visible.stream().map(pattern -> "- **" + pattern.title() + "** · 지지 "
                + pattern.supportingCount() + "건 · 반대 " + pattern.contradictingCount() + "건")
                .reduce((left, right) -> left + "\n" + right).orElse("");
        return fallbackResult("지금 내 기록에서 반복해서 연결된 패턴은 이거예요.\n\n" + details
                        + "\n\n피부 타입 판정이 아니라, 실제로 남긴 경험의 반복만 보여줘요.",
                List.of("첫 번째 패턴 근거를 볼래", "반대 기록도 볼래"),
                visible.stream().map(pattern -> "PT-" + pattern.id()).toList());
    }

    private AiResult rescueFallbackIfNeeded(long conversationId, AiResult result, String stage) {
        return result.status().equals("FALLBACK") ? rescueFallback(conversationId, stage) : result;
    }

    private AiResult rescueFallback(long conversationId, String stage) {
        if (stage.equals("SAFETY_UNKNOWN")) {
            return fallbackResult(
                    "잘 모르겠다면 제품 확인 순서는 아직 정하지 않을게요. **빠르게 악화되는지, 통증이 심한지, 눈이나 입술이 붓거나 숨쉬기 불편한지**만 다시 확인해 주세요.",
                    List.of("그런 증상은 없어요", "빠르게 심해지고 있어요"), List.of());
        }
        if (stage.equals("CHANGE_CORRECTION")) {
            return fallbackResult(
                    "말해준 내용은 저장된 루틴과 달라서 아직 변경 사실로 확정하지 않았어요. **현재 저장된 변경만으로 계속할지, 루틴을 먼저 고칠지** 선택해 주세요.",
                    List.of("저장된 변경만으로 계속할게요", "루틴을 먼저 고칠게요"), rescueRoutineEvidence());
        }
        if (stage.equals("CHANGES")) return rescueChangesFallback();

        RescuePlanView plan = repository.findRescuePlan(conversationId).orElse(null);
        if (plan == null) return rescueChangesFallback();
        List<String> evidence = new ArrayList<>(rescueRoutineEvidence());
        if (plan.removeUserProductId() != null) {
            UserProductView candidate = skincareService.userProduct(plan.removeUserProductId());
            if (candidate.product() != null) evidence.add("P-" + candidate.product().id());
        }
        String action = plan.status().equals("PROPOSED")
                ? "사용자가 적용하기 전에는 현재 루틴을 바꾸지 않아요."
                : "현재 기록만으로는 자동 적용할 루틴을 만들지 않았어요.";
        return fallbackResult("다음 확인 순서는 **" + plan.title() + "**이에요.\n\n" + plan.rationale()
                        + " 특정 제품을 원인으로 단정한 결과는 아니에요. " + action,
                plan.status().equals("PROPOSED")
                        ? List.of("이 루틴으로 적용할래", "적용하지 않고 기록만 남길래")
                        : List.of("현재 루틴을 다시 볼래", "기록만 남길래"), evidence);
    }

    private AiResult rescueChangesFallback() {
        RoutineView current = repository.findCurrentRoutine().orElse(null);
        RoutineView baseline = repository.findBaselineRoutine().orElse(null);
        if (current == null) {
            return fallbackResult(
                    "**저장된 현재 루틴이 없어서 변경점을 비교할 수 없어요.** 지금 실제 사용하는 제품 조합을 먼저 루틴으로 등록해 주세요.",
                    List.of("현재 루틴을 만들게요", "기록만 남길게요"), rescueRoutineEvidence());
        }
        List<Long> baselineIds = baseline == null ? List.of() : repository.findRoutineUserProductIds(baseline.id());
        List<RoutineItemView> changed = current.items().stream()
                .filter(item -> !baselineIds.contains(item.userProductId())).toList();
        String changeText = changed.isEmpty() ? "추가된 제품을 찾지 못했어요"
                : changed.stream().map(RoutineItemView::productName).reduce((left, right) -> left + " · " + right).orElse("");
        return fallbackResult("기록된 비교 기준 이후 달라진 제품은 **" + changeText
                        + "**예요. 실제로 함께 바꾼 제품이나 사용 빈도가 더 있었나요?",
                List.of("저장된 변경이 맞아요", "다른 변경도 있었어요"), rescueRoutineEvidence());
    }

    private List<String> rescueRoutineEvidence() {
        List<String> evidence = new ArrayList<>();
        repository.findCurrentRoutine().ifPresent(routine -> evidence.add("R-" + routine.id()));
        repository.findBaselineRoutine().ifPresent(routine -> evidence.add("R-" + routine.id()));
        return evidence;
    }

    private AiResult fallbackResult(String text, List<String> suggestions, List<String> evidence) {
        return new AiResult(text, "FALLBACK", suggestions, evidence.stream().distinct().limit(8).toList(), List.of());
    }

    private void saveAi(long conversationId, long userMessageId, AiResult result) {
        saveAi(conversationId, userMessageId, result, "assistant-");
    }

    private void saveAi(long conversationId, long userMessageId, AiResult result, String clientRequestPrefix) {
        repository.insertMessage(
                conversationId, "ASSISTANT", result.text(), result.status(),
                clientRequestPrefix + userMessageId, result.suggestedReplies(), result.evidenceRefs(), result.webSources());
    }

    private String contextFor(long conversationId, String mode) {
        Map<String, Object> row = repository.findConversationRow(conversationId).orElseThrow();
        StringBuilder context = new StringBuilder();
        Long productId = nullableLong(row.get("product_id"));
        if (productId != null) {
            ProductView product = skincareService.product(productId);
            context.append("P-").append(product.id()).append(" 제품: ")
                    .append(product.brand()).append(" / ").append(product.name()).append(" / ")
                    .append(product.category()).append(" / 용량 ").append(product.volume())
                    .append(" / 버전 ").append(product.versionLabel()).append("\n");
            appendProductGuide(context, product);
            product.facts().forEach(fact -> context.append("P-").append(product.id())
                    .append(" 출처 확인 사실[").append(fact.sourceLabel()).append("]: ")
                    .append(fact.text()).append("\n"));
        }
        if (mode.equals("RECOMMEND")) {
            List<ProductView> candidates = recommendationCandidates(conversationId);
            for (int index = 0; index < candidates.size(); index++) {
                ProductView candidate = candidates.get(index);
                context.append("P-").append(candidate.id()).append(" 서버 후보 순위 ")
                        .append(index + 1).append(": ").append(candidate.brand()).append(" / ")
                        .append(candidate.name()).append(" / ").append(candidate.category())
                        .append(" / 용량 ").append(candidate.volume()).append(" / 버전 ")
                        .append(candidate.versionLabel()).append("\n");
                appendProductGuide(context, candidate);
                candidate.facts().forEach(fact -> context.append("P-").append(candidate.id())
                        .append(" 출처 확인 사실[").append(fact.sourceLabel()).append("]: ")
                        .append(fact.text()).append("\n"));
            }
            if (candidates.isEmpty()) context.append("추천 가능한 미보유 카탈로그 후보 없음\n");
        }
        List<UserProductView> ownedProducts = skincareService.userProducts();
        if (ownedProducts.isEmpty()) context.append("내 화장품: 없음\n");
        else {
            context.append("내 화장품:\n");
            ownedProducts.stream().limit(30).forEach(item -> {
                if (item.product() != null) {
                    context.append("P-").append(item.product().id()).append(" 보유 제품: ")
                            .append(item.product().brand()).append(" / ").append(item.product().name())
                            .append(" / ").append(item.product().category()).append("\n");
                } else {
                    context.append("사용자 직접 등록 보유 제품: ").append(item.customBrand()).append(" / ")
                            .append(item.customName()).append(" / ").append(item.customCategory()).append("\n");
                }
            });
        }
        repository.findCurrentRoutine().ifPresent(routine -> appendRoutine(context, routine, "CURRENT"));
        List<RoutineView> baselines = repository.findBaselineRoutines(3);
        for (int index = 0; index < baselines.size(); index++) {
            appendRoutine(context, baselines.get(index), index == 0 ? "LATEST_BASELINE" : "PAST_BASELINE_" + (index + 1));
        }
        for (ExperienceRecordView record : repository.findRelevantRecords(productId, 6)) appendRecord(context, record);
        if (mode.equals("PATTERN") || mode.equals("RECOMMEND")) {
            repository.findPatterns().stream().limit(3).forEach(pattern -> context.append("PT-")
                    .append(pattern.id()).append(" 패턴 후보: ").append(pattern.title())
                    .append(" / 지지 ").append(pattern.supportingCount())
                    .append(" / 반대 ").append(pattern.contradictingCount()).append("\n"));
        }
        appendHistory(context, conversationId);
        return context.toString();
    }

    private List<ProductView> recommendationCandidates(long conversationId) {
        List<ProductView> available = skincareService.products("").stream()
                .filter(candidate -> !candidate.owned())
                .toList();
        String conversationText = repository.findMessages(conversationId).stream()
                .map(MessageView::content)
                .reduce("", (left, right) -> left + " " + right)
                .toLowerCase(Locale.ROOT).replace(" ", "");
        List<String> preferredCategories = preferredCategories(conversationText);
        if (preferredCategories.isEmpty()) return available.stream().limit(3).toList();

        List<ProductView> matched = available.stream()
                .filter(product -> preferredCategories.stream().anyMatch(keyword ->
                        product.category().toLowerCase(Locale.ROOT).contains(keyword)))
                .limit(3)
                .toList();
        return matched.isEmpty() ? available.stream().limit(3).toList() : matched;
    }

    private List<String> preferredCategories(String conversationText) {
        if (containsAny(conversationText, "선크림", "선케어", "자외선", "spf", "야외", "밖에오래", "햇빛")) {
            return List.of("선", "자외선");
        }
        if (containsAny(conversationText, "클렌징", "클렌저", "세안", "씻")) return List.of("클렌", "워시");
        if (conversationText.contains("토너")) return List.of("토너", "스킨");
        if (containsAny(conversationText, "세럼", "앰플", "에센스")) return List.of("세럼", "앰플", "에센스");
        if (containsAny(conversationText, "크림", "로션", "보습")) return List.of("크림", "로션", "모이스처");
        if (containsAny(conversationText, "립", "입술")) return List.of("립");
        return List.of();
    }

    private boolean containsAny(String value, String... candidates) {
        return List.of(candidates).stream().anyMatch(value::contains);
    }

    private void appendProductGuide(StringBuilder context, ProductView product) {
        ProductGuide guide = product.guide();
        context.append("P-").append(product.id())
                .append("AI_GENERATED".equals(guide.origin())
                        ? " AI 생성 제품 가이드(출처 확인 사실 아님): "
                        : " 편집 제품 가이드(출처 확인 사실 아님): ")
                .append(guide.summary())
                .append(" / 일반 루틴 위치 ").append(guide.routineStep())
                .append(" / 사용 유형 ").append(guide.usageType())
                .append(" / 일반 사용 시점 ").append(guide.usageTiming())
                .append(" / 일반 사용법 ").append(guide.usageInstructions())
                .append(" / 제품 특징 안내 ")
                .append(guide.highlights().stream()
                        .map(highlight -> highlight.title() + ": " + highlight.detail())
                        .toList())
                .append("\n");
    }

    private String rescueContext(long conversationId, String safetyState) {
        StringBuilder context = new StringBuilder("서버 안전 상태: ").append(safetyState).append("\n");
        RoutineView current = repository.findCurrentRoutine().orElse(null);
        RoutineView baseline = repository.findBaselineRoutine().orElse(null);
        if (baseline == null) context.append("비교 기준 루틴: 없음\n");
        else appendRoutine(context, baseline, "BASELINE");
        if (current == null) context.append("현재 루틴: 없음\n");
        else appendRoutine(context, current, "CURRENT");
        if (current != null) {
            List<Long> baselineIds = baseline == null ? List.of() : repository.findRoutineUserProductIds(baseline.id());
            current.items().stream().filter(item -> !baselineIds.contains(item.userProductId()))
                    .forEach(item -> context.append("변경 사실: CURRENT에 추가된 제품 ")
                            .append(item.productName()).append(" [UP-").append(item.userProductId()).append("]\n"));
        }
        repository.findExperienceRecords().stream().limit(8).forEach(record -> appendRecord(context, record));
        repository.findRescuePlan(conversationId).ifPresent(plan -> context.append("서버 제안: ")
                .append(plan.title()).append(" / ").append(plan.rationale()).append(" / 상태 ").append(plan.status()).append("\n"));
        appendHistory(context, conversationId);
        return context.toString();
    }

    private void appendRoutine(StringBuilder context, RoutineView routine, String label) {
        context.append("R-").append(routine.id()).append(' ').append(label).append(" 루틴: ")
                .append(routine.name()).append(" / ")
                .append(routine.items().stream().map(item -> item.productName() + "(" + item.timeSlot() + ", " + item.frequency() + ")").toList()).append("\n");
    }

    private void appendRecord(StringBuilder context, ExperienceRecordView record) {
        context.append("E-").append(record.id()).append(" 개인 경험: ")
                .append(record.productName()).append(" / 평가 ").append(record.sentiment())
                .append(" / 사용 결과 원문 “").append(record.note()).append("”")
                .append(" / 사용자가 고른 태그 ").append(record.tags())
                .append(" / 불편 ").append(record.discomfort())
                .append(" / 실제 사용 일치 ").append(record.adherence())
                .append(" / 기록 시각 ").append(record.createdAt()).append("\n");
    }

    private void appendHistory(StringBuilder context, long conversationId) {
        List<MessageView> history = repository.findMessages(conversationId);
        int from = Math.max(0, history.size() - 8);
        context.append("최근 대화:\n");
        history.subList(from, history.size()).forEach(message -> context.append(message.role())
                .append(": ").append(message.content()).append("\n"));
    }

    private String normalizeMode(String mode) {
        String normalized = mode.trim().toUpperCase(Locale.ROOT);
        if (!MODES.contains(normalized)) throw ApiException.invalid("INVALID_CONVERSATION_MODE", "지원하지 않는 AI 대화 유형이에요.");
        return normalized;
    }

    private boolean isSevere(String message) {
        String value = message.replace(" ", "");
        if (value.contains("않") || value.contains("아니")) return false;
        return List.of("빠르게심해", "점점심해", "숨쉬기", "입술이부", "눈이부", "물집", "진물", "통증이심")
                .stream().anyMatch(value::contains);
    }

    private boolean isRecommendationIntent(String message) {
        String value = message.toLowerCase(Locale.ROOT).replace(" ", "");
        return List.of("추천", "골라줘", "골라봐", "뭐사", "뭘사", "살만한제품", "제품찾아줘")
                .stream().anyMatch(value::contains);
    }

    private boolean isUnknown(String message) {
        return message.contains("모르") || message.contains("애매");
    }

    private boolean isRescueIntent(String message) {
        String value = message.toLowerCase(Locale.ROOT).replace(" ", "");
        if (value.contains("불편했던경험찾기") || value.contains("불편했던기록")) return false;
        return List.of(
                "피부가불편", "불편해졌", "문제가생", "피부가뒤집", "뒤집어졌",
                "따가워", "따갑", "따끔", "가려워", "가렵", "화끈", "쓰라",
                "붉어졌", "빨개졌", "트러블이났", "뾰루지가", "발진", "부었",
                "붓고", "물집", "진물", "통증이", "열감이심"
        ).stream().anyMatch(value::contains);
    }

    private boolean confirmsRecordedChanges(String message) {
        String value = message.replace(" ", "");
        return List.of("맞아", "맞아요", "맞습니다", "없어", "없어요", "그대로", "계속", "이대로", "네", "응")
                .stream().anyMatch(value::contains);
    }

    private Long nullableLong(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }
}
