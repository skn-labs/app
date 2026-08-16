package app.skn.api;

import app.skn.api.ApiModels.AuthView;
import app.skn.api.ApiModels.LoginRequest;
import app.skn.api.ApiModels.SignUpRequest;
import app.skn.api.ApiModels.QuickAccountView;
import app.skn.api.ApiModels.CompleteOnboardingRequest;
import app.skn.api.ApiModels.OnboardingResult;
import app.skn.auth.AuthService;
import app.skn.auth.CurrentUser;
import app.skn.service.OnboardingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService service;
    private final CurrentUser currentUser;
    private final OnboardingService onboardingService;

    public AuthController(AuthService service, CurrentUser currentUser, OnboardingService onboardingService) {
        this.service = service;
        this.currentUser = currentUser;
        this.onboardingService = onboardingService;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    AuthView signUp(@Valid @RequestBody SignUpRequest request, HttpServletRequest servletRequest,
                    HttpServletResponse servletResponse) {
        return service.signUp(request, servletRequest, servletResponse);
    }

    @PostMapping("/quick-signup")
    @ResponseStatus(HttpStatus.CREATED)
    AuthView quickSignUp(HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        return service.quickSignUp(servletRequest, servletResponse);
    }

    @PostMapping("/login")
    AuthView login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest,
                   HttpServletResponse servletResponse) {
        return service.login(request, servletRequest, servletResponse);
    }

    @PostMapping("/demo")
    AuthView demo(HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        return service.demo(servletRequest, servletResponse);
    }

    @GetMapping("/quick-accounts")
    List<QuickAccountView> quickAccounts() {
        return service.quickAccounts();
    }

    @PostMapping("/quick-login/{username}")
    AuthView quickLogin(@PathVariable String username, HttpServletRequest servletRequest,
                        HttpServletResponse servletResponse) {
        return service.quickLogin(username, servletRequest, servletResponse);
    }

    @GetMapping("/me")
    AuthView me() {
        return service.me(currentUser);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        service.logout(servletRequest, servletResponse);
    }

    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteAccount(HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
        service.deleteAccount(currentUser, servletRequest, servletResponse);
    }

    @PostMapping("/onboarding")
    OnboardingResult completeOnboarding(@Valid @RequestBody CompleteOnboardingRequest request) {
        return onboardingService.complete(request);
    }
}
