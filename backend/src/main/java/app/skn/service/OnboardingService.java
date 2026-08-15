package app.skn.service;

import app.skn.api.ApiModels.AuthView;
import app.skn.api.ApiModels.CompleteOnboardingRequest;
import app.skn.api.ApiModels.OnboardingResult;
import app.skn.api.ApiModels.SkinProfileRequest;
import app.skn.api.ApiModels.SkinProfileView;
import app.skn.auth.AuthRepository;
import app.skn.auth.CurrentUser;
import app.skn.data.SkincareRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class OnboardingService {
    private final CurrentUser currentUser;
    private final AuthRepository authRepository;
    private final SkincareRepository skincareRepository;

    public OnboardingService(CurrentUser currentUser, AuthRepository authRepository,
                             SkincareRepository skincareRepository) {
        this.currentUser = currentUser;
        this.authRepository = authRepository;
        this.skincareRepository = skincareRepository;
    }

    @Transactional
    public OnboardingResult complete(CompleteOnboardingRequest request) {
        long userId = currentUser.id();
        SkinProfileRequest profile = request.profile();
        authRepository.saveSkinProfile(userId, profile);
        // 기존 개인화 화면에서도 같은 자기보고 사용감을 바로 확인할 수 있게 동기화한다.
        authRepository.savePreference(userId, clean(profile.textures()), clean(profile.avoids()), profile.avoidNote());
        authRepository.completeOnboarding(userId, "EXPLORE", 0);
        skincareRepository.insertProfileReadyNotification();
        AuthView user = authRepository.findUser(userId).orElseThrow();
        SkinProfileView saved = authRepository.findSkinProfile(userId).orElseThrow();
        return new OnboardingResult(user, saved);
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
