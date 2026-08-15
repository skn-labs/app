package app.skn.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class ApiModels {
    private ApiModels() {}

    public record ProductView(
            long id,
            String brand,
            String name,
            String category,
            String volume,
            String versionLabel,
            boolean verified,
            ProductGuide guide,
            List<ProductFact> facts,
            int personalRecordCount,
            boolean owned,
            String imageUrl
    ) {}

    public record ProductGuide(
            String summary,
            String routineStep,
            String usageType,
            List<String> usageTiming,
            List<String> usageInstructions,
            List<ProductHighlight> highlights,
            String origin,
            String generatedAt
    ) {}

    public record ProductHighlight(
            String title,
            String detail
    ) {}

    public record ProductFact(
            String type,
            String text,
            String sourceLabel,
            String sourceUrl,
            String checkedAt
    ) {}

    public record ProductPageView(
            List<ProductView> items,
            String nextCursor,
            boolean hasMore
    ) {}

    public record UserProductView(
            long id,
            ProductView product,
            String customBrand,
            String customName,
            String customCategory,
            String memo,
            String addedAt,
            int personalRecordCount,
            boolean inCurrentRoutine
    ) {
        public String displayName() {
            return product != null ? product.name() : customName;
        }
    }

    public record RoutineItemView(
            long userProductId,
            String productName,
            String brand,
            String category,
            String timeSlot,
            int position,
            String frequency
    ) {}

    public record RoutineItemInput(
            @NotNull Long userProductId,
            @NotBlank String timeSlot,
            @NotBlank @Size(max = 20) String frequency
    ) {}

    public record RoutineView(
            long id,
            String name,
            String dayPart,
            String status,
            String startedAt,
            List<RoutineItemView> items
    ) {}

    public record ExperienceView(
            long id,
            String subjectType,
            Long routineId,
            Long userProductId,
            String title,
            String subtitle,
            String status,
            String startedAt,
            String reviewDueAt,
            int day,
            int daysUntilReview,
            boolean reviewDue,
            RoutineView routine,
            UserProductView product,
            ExperienceRecordView latestRecord
    ) {}

    public record ExperienceRecordView(
            long id,
            Long sessionId,
            Long userProductId,
            String productName,
            String sentiment,
            String note,
            String discomfort,
            String adherence,
            List<String> tags,
            String createdAt
    ) {}

    public record PatternEvidenceView(
            long recordId,
            String productName,
            String note,
            String sentiment,
            String polarity,
            String createdAt
    ) {}

    public record PatternView(
            long id,
            String title,
            String summary,
            String confidenceNote,
            int supportingCount,
            int contradictingCount,
            List<PatternEvidenceView> evidence
    ) {}

    public record HomeView(
            String displayName,
            ExperienceView currentExperience,
            List<PatternView> patterns,
            int productCount,
            int recordCount,
            String primaryAction
    ) {}

    public record NotificationActionView(
            String type,
            String label,
            String href
    ) {}

    public record NotificationView(
            long id,
            String type,
            String title,
            String body,
            String createdAt,
            String availableAt,
            String readAt,
            String snoozedUntil,
            String completedAt,
            boolean read,
            boolean completed,
            NotificationActionView action
    ) {}

    public record NotificationInboxView(
            List<NotificationView> items,
            int unreadCount
    ) {}

    public record SnoozeNotificationRequest(
            @NotNull @Min(1) @Max(168) Integer durationHours
    ) {}

    public record StartExperienceRequest(
            @NotNull Long userProductId,
            @NotBlank String mode,
            String dayPart,
            @NotBlank String clientRequestId
    ) {}

    public record RecordExperienceRequest(
            @NotBlank String sentiment,
            @Size(max = 1200) String note,
            List<@NotBlank String> tags,
            @NotBlank String discomfort,
            String adherence,
            @NotBlank String clientRequestId
    ) {}

    public record SavedExperienceRecord(
            ExperienceRecordView record,
            Long linkedPatternId,
            boolean rescueSuggested
    ) {}

    public record AddUserProductRequest(
            Long productId,
            @Size(max = 120) String customBrand,
            @Size(max = 160) String customName,
            @Size(max = 80) String customCategory,
            @Size(max = 1000) String memo
    ) {}

    public record UpdateRoutineRequest(
            @NotBlank String name,
            @NotEmpty List<@NotNull RoutineItemInput> items
    ) {}

    public record CreateConversationRequest(
            @NotBlank String mode,
            Long productId,
            Long experienceId,
            @NotBlank @Size(max = 1500) String initialPrompt,
            @NotBlank String clientRequestId
    ) {}

    public record SendMessageRequest(
            @NotBlank @Size(max = 1500) String text,
            @NotBlank String clientRequestId
    ) {}

    public record MessageView(
            long id,
            String role,
            String content,
            List<String> suggestedReplies,
            List<String> evidenceRefs,
            List<WebSourceView> webSources,
            String status,
            String createdAt
    ) {}

    public record WebSourceView(
            String ref,
            String title,
            String url,
            String tier
    ) {}

    public record RescuePlanView(
            long id,
            Long baseRoutineId,
            String title,
            String rationale,
            Long removeUserProductId,
            String removeProductName,
            String status,
            Long appliedExperienceId
    ) {}

    public record ConversationView(
            long id,
            String mode,
            Long productId,
            Long experienceId,
            String status,
            List<MessageView> messages,
            List<String> quickReplies,
            RescuePlanView rescuePlan,
            boolean safetyBoundary
    ) {}

    public record ApplyRescueRequest(@NotBlank String clientRequestId) {}

    public record ApiMessage(String message) {}

    public record SignUpRequest(
            @NotBlank @Size(min = 4, max = 24) String username,
            @NotBlank @Size(min = 8, max = 72) String password
    ) {}

    public record LoginRequest(
            @NotBlank String username,
            @NotBlank String password
    ) {}

    public record AuthView(
            long userId,
            String username,
            String displayName,
            boolean demo,
            boolean onboardingCompleted
    ) {}

    public record QuickAccountView(
            String username,
            String displayName
    ) {}

    public record CompleteOnboardingRequest(
            @NotNull @Valid SkinProfileRequest profile,
            @NotBlank String clientRequestId
    ) {}

    /** 사용자가 prototype_2의 8단계에서 직접 선택한 피부 프로필이다. */
    public record SkinProfileRequest(
            @NotBlank @Pattern(regexp = "10S|20S|30S|40S|50S|60_PLUS") String ageRange,
            @NotBlank @Pattern(regexp = "MALE|FEMALE") String gender,
            @NotBlank @Pattern(regexp = "DRY|OILY|COMBINATION|NORMAL|UNSURE") String skinType,
            @NotNull @Min(1) @Max(5) Integer skinCondition,
            @NotEmpty @Size(max = 20) List<@NotBlank @Size(max = 40) String> concerns,
            @NotEmpty @Size(max = 20) List<@NotBlank @Size(max = 40) String> textures,
            @NotNull @Size(max = 20) List<@NotBlank @Size(max = 40) String> avoids,
            @Size(max = 300) String avoidNote,
            @NotBlank @Pattern(regexp = "RARELY|EVERY_FEW_MONTHS|ONE_OR_TWO_MONTHLY|THREE_PLUS_MONTHLY") String trialFrequency
    ) {}

    public record SkinProfileView(
            String ageRange,
            String gender,
            String skinType,
            int skinCondition,
            List<String> concerns,
            List<String> textures,
            List<String> avoids,
            String avoidNote,
            String trialFrequency
    ) {}

    /**
     * ONB-01. 온보딩에서 선택적으로 받는 사용감 선호이며 비워서 보내도 된다.
     * 피부 타입·연령·성별 같은 고정 속성은 받지 않는다(ACC-03, product-rules 10).
     */
    public record PreferenceRequest(
            @Size(max = 12) List<@NotNull @Size(max = 40) String> likes,
            @Size(max = 12) List<@NotNull @Size(max = 40) String> avoids,
            @Size(max = 300) String note
    ) {}

    public record PreferenceView(
            List<String> likes,
            List<String> avoids,
            String note
    ) {}

    public record OnboardingResult(
            AuthView user,
            SkinProfileView profile
    ) {}
}
