package app.skn.api;

import app.skn.api.ApiModels.PreferenceRequest;
import app.skn.api.ApiModels.PreferenceView;
import app.skn.api.ApiModels.SkinProfileRequest;
import app.skn.api.ApiModels.SkinProfileView;
import app.skn.auth.AuthRepository;
import app.skn.auth.CurrentUser;
import app.skn.common.ApiException;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * ONB-01. 온보딩에서 선택적으로 받은 사용감 선호를 뒤에서도 보고 고칠 수 있게 한다.
 * 저장한 적이 없으면 빈 값을 돌려주므로 호출부는 404를 다루지 않아도 된다.
 */
@RestController
@RequestMapping("/api/v1")
public class PreferenceController {
    private final CurrentUser currentUser;
    private final AuthRepository repository;

    public PreferenceController(CurrentUser currentUser, AuthRepository repository) {
        this.currentUser = currentUser;
        this.repository = repository;
    }

    @GetMapping("/me/preferences")
    PreferenceView preferences() {
        return repository.findPreference(currentUser.id());
    }

    @PutMapping("/me/preferences")
    PreferenceView replacePreferences(@Valid @RequestBody PreferenceRequest request) {
        long userId = currentUser.id();
        repository.savePreference(
                userId,
                request.likes() == null ? List.of() : request.likes(),
                request.avoids() == null ? List.of() : request.avoids(),
                request.note());
        return repository.findPreference(userId);
    }

    @GetMapping("/me/skin-profile")
    SkinProfileView skinProfile() {
        return repository.findSkinProfile(currentUser.id())
                .orElseThrow(() -> ApiException.notFound("저장된 피부 프로필이 없어요."));
    }

    @PutMapping("/me/skin-profile")
    SkinProfileView replaceSkinProfile(@Valid @RequestBody SkinProfileRequest request) {
        long userId = currentUser.id();
        repository.saveSkinProfile(userId, request);
        repository.savePreference(
                userId,
                request.textures().stream().distinct().limit(12).toList(),
                request.avoids().stream().distinct().limit(12).toList(),
                request.avoidNote());
        return repository.findSkinProfile(userId).orElseThrow();
    }
}
