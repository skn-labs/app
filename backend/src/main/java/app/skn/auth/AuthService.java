package app.skn.auth;

import app.skn.api.ApiModels.AuthView;
import app.skn.api.ApiModels.LoginRequest;
import app.skn.api.ApiModels.SignUpRequest;
import app.skn.api.ApiModels.QuickAccountView;
import app.skn.common.ApiException;
import app.skn.config.TestHarnessProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
public class AuthService {
    private static final Pattern USERNAME = Pattern.compile("^[a-z0-9_]{4,24}$");
    // 데모 닉네임: 형용사(≤3자) + 동물(≤3자) 랜덤 조합
    private static final String[] NICK_ADJECTIVES = {
        "말랑한", "몽글한", "포근한", "느긋한", "산뜻한", "보송한", "상큼한", "촉촉한", "나른한", "은은한",
        "새침한", "깜찍한", "다정한", "차분한", "발랄한", "도톰한", "뽀송한", "잔잔한", "따뜻한", "소복한"
    };
    private static final String[] NICK_ANIMALS = {
        "토끼", "수달", "여우", "고래", "판다", "사슴", "오리", "참새", "하마", "물개",
        "두더지", "다람쥐", "너구리", "알파카", "고양이", "강아지", "햄스터", "두루미", "청설모", "물범"
    };
    private static final java.security.SecureRandom RANDOM = new java.security.SecureRandom();
    private final AuthRepository repository;
    private final TestHarnessProperties testHarness;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(11);

    public AuthService(AuthRepository repository, TestHarnessProperties testHarness) {
        this.repository = repository;
        this.testHarness = testHarness;
    }

    @Transactional
    public AuthView signUp(SignUpRequest request, HttpServletRequest servletRequest) {
        String username = normalizeUsername(request.username());
        long userId;
        try {
            userId = repository.insert(username, passwords.encode(request.password()), username);
        } catch (DuplicateKeyException exception) {
            throw ApiException.conflict("USERNAME_TAKEN", "이미 사용 중인 아이디예요.");
        }
        startSession(servletRequest, userId);
        return repository.findUser(userId).orElseThrow();
    }

    @Transactional
    public AuthView quickSignUp(HttpServletRequest servletRequest) {
        String nickname = NICK_ADJECTIVES[RANDOM.nextInt(NICK_ADJECTIVES.length)] + " " + NICK_ANIMALS[RANDOM.nextInt(NICK_ANIMALS.length)];
        String passwordHash = passwords.encode(Long.toHexString(RANDOM.nextLong()) + Long.toHexString(RANDOM.nextLong()));
        for (int attempt = 0; attempt < 8; attempt++) {
            String username = "demo_" + Long.toString(RANDOM.nextInt(1 << 30) + (1L << 30), 36);
            try {
                long userId = repository.insert(username, passwordHash, nickname);
                startSession(servletRequest, userId);
                return repository.findUser(userId).orElseThrow();
            } catch (DuplicateKeyException ignored) {
                // 아이디가 겹치면 다른 값으로 재시도
            }
        }
        throw ApiException.conflict("USERNAME_TAKEN", "잠시 후 다시 시도해주세요.");
    }

    public AuthView login(LoginRequest request, HttpServletRequest servletRequest) {
        String username = normalizeUsername(request.username());
        Map<String, Object> row = repository.findCredentials(username)
                .orElseThrow(() -> ApiException.unauthorized("INVALID_CREDENTIALS", "아이디 또는 비밀번호를 확인해주세요."));
        String hash = (String) row.get("password_hash");
        if (hash == null || !passwords.matches(request.password(), hash)) {
            throw ApiException.unauthorized("INVALID_CREDENTIALS", "아이디 또는 비밀번호를 확인해주세요.");
        }
        long userId = ((Number) row.get("id")).longValue();
        startSession(servletRequest, userId);
        return repository.findUser(userId).orElseThrow();
    }

    public AuthView demo(HttpServletRequest servletRequest) {
        startSession(servletRequest, 1L);
        return repository.findUser(1L).orElseThrow();
    }

    public List<QuickAccountView> quickAccounts() {
        requireTestHarness();
        return repository.findQuickAccounts();
    }

    public AuthView quickLogin(String rawUsername, HttpServletRequest servletRequest) {
        requireTestHarness();
        String username = normalizeUsername(rawUsername);
        Map<String, Object> row = repository.findCredentials(username)
                .orElseThrow(() -> ApiException.notFound("빠른 로그인 계정을 찾을 수 없어요."));
        if (((Number) row.get("is_demo")).intValue() == 1) {
            throw ApiException.notFound("빠른 로그인 계정을 찾을 수 없어요.");
        }
        long userId = ((Number) row.get("id")).longValue();
        startSession(servletRequest, userId);
        return repository.findUser(userId).orElseThrow();
    }

    public AuthView me(CurrentUser currentUser) {
        return repository.findUser(currentUser.id())
                .orElseThrow(() -> ApiException.notFound("계정을 찾을 수 없어요."));
    }

    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
    }

    @Transactional
    public void deleteAccount(CurrentUser currentUser, HttpServletRequest request) {
        AuthView user = repository.findUser(currentUser.id())
                .orElseThrow(() -> ApiException.notFound("계정을 찾을 수 없어요."));
        if (user.demo()) throw ApiException.forbidden("DEMO_ACCOUNT", "데모 계정은 삭제할 수 없어요.");
        repository.delete(user.userId());
        logout(request);
    }

    private String normalizeUsername(String raw) {
        String username = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (!USERNAME.matcher(username).matches()) {
            throw ApiException.invalid("INVALID_USERNAME", "아이디는 영문 소문자·숫자·_를 사용해 4~24자로 입력해주세요.");
        }
        return username;
    }

    private void requireTestHarness() {
        if (!testHarness.enabled()) {
            throw ApiException.notFound("페이지를 찾을 수 없어요.");
        }
    }

    private void startSession(HttpServletRequest request, long userId) {
        HttpSession existing = request.getSession(false);
        if (existing != null) existing.invalidate();
        HttpSession session = request.getSession(true);
        session.setAttribute(CurrentUser.SESSION_USER_ID, userId);
        session.setMaxInactiveInterval(60 * 60 * 24 * 14);
    }
}
