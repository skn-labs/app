package app.skn.service;

import app.skn.api.ApiModels.AddUserProductRequest;
import app.skn.api.ApiModels.AuthView;
import app.skn.api.ApiModels.CompleteOnboardingRequest;
import app.skn.api.ApiModels.ExperienceView;
import app.skn.api.ApiModels.OnboardingResult;
import app.skn.api.ApiModels.PreferenceRequest;
import app.skn.api.ApiModels.StartExperienceRequest;
import app.skn.api.ApiModels.UserProductView;
import app.skn.auth.AuthRepository;
import app.skn.auth.CurrentUser;
import app.skn.common.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class OnboardingService {
    private static final Set<String> ENTRY_CHOICES = Set.of("PRODUCT", "ROUTINE", "EXPLORE");

    private final CurrentUser currentUser;
    private final AuthRepository authRepository;
    private final SkincareService skincareService;

    public OnboardingService(CurrentUser currentUser, AuthRepository authRepository,
                             SkincareService skincareService) {
        this.currentUser = currentUser;
        this.authRepository = authRepository;
        this.skincareService = skincareService;
    }

    @Transactional
    public OnboardingResult complete(CompleteOnboardingRequest request) {
        long userId = currentUser.id();
        String entryChoice = request.entryChoice().trim().toUpperCase(Locale.ROOT);
        if (!ENTRY_CHOICES.contains(entryChoice)) {
            throw ApiException.invalid("INVALID_ONBOARDING_ENTRY", "어떻게 시작할지 다시 선택해주세요.");
        }

        List<Long> productIds = request.productIds() == null
                ? List.of()
                : List.copyOf(new LinkedHashSet<>(request.productIds()));
        if (productIds.size() > 8) {
            throw ApiException.invalid("TOO_MANY_ONBOARDING_PRODUCTS", "온보딩에서는 화장품을 8개까지 고를 수 있어요.");
        }

        List<UserProductView> owned = productIds.stream()
                .map(productId -> skincareService.addUserProduct(
                        new AddUserProductRequest(productId, null, null, null, null)))
                .toList();

        ExperienceView experience = null;
        if (entryChoice.equals("PRODUCT")) {
            if (request.focusProductId() == null || !productIds.contains(request.focusProductId())) {
                throw ApiException.invalid("FOCUS_PRODUCT_REQUIRED", "먼저 써볼 화장품 하나를 골라주세요.");
            }
            UserProductView focus = owned.stream()
                    .filter(item -> item.product() != null && item.product().id() == request.focusProductId())
                    .findFirst()
                    .orElseThrow(() -> ApiException.notFound("선택한 화장품을 찾을 수 없어요."));
            experience = skincareService.startExperience(new StartExperienceRequest(
                    focus.id(), "PRODUCT", "EVENING", request.clientRequestId()));
        } else if (entryChoice.equals("ROUTINE") && owned.isEmpty()) {
            throw ApiException.invalid("ROUTINE_PRODUCTS_REQUIRED", "루틴으로 시작하려면 화장품을 하나 이상 골라주세요.");
        }

        savePreferences(userId, request.preferences());
        authRepository.completeOnboarding(userId, entryChoice, productIds.size());
        AuthView user = authRepository.findUser(userId).orElseThrow();
        return new OnboardingResult(user, experience);
    }

    /**
     * ONB-01. 사용감 선호는 선택 항목이라 통째로 비어 오면 아무것도 쓰지 않는다.
     * 건너뛴 사용자에게 빈 행을 만들어 두면 "답했지만 비움"과 구분되지 않는다.
     */
    private void savePreferences(long userId, PreferenceRequest preferences) {
        if (preferences == null) return;

        List<String> likes = clean(preferences.likes());
        List<String> avoids = clean(preferences.avoids());
        String note = preferences.note() == null ? "" : preferences.note().trim();
        if (likes.isEmpty() && avoids.isEmpty() && note.isEmpty()) return;

        authRepository.savePreference(userId, likes, avoids, note);
    }

    private List<String> clean(List<String> values) {
        if (values == null) return List.of();
        return values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .distinct()
                .limit(12)
                .toList();
    }
}
