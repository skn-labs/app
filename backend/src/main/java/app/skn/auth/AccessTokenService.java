package app.skn.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class AccessTokenService {
    public static final String COOKIE_NAME = "skn_access_token";
    public static final Duration TOKEN_TTL = Duration.ofDays(30);

    private static final int TOKEN_BYTES = 32;
    private static final int ENCODED_TOKEN_LENGTH = 43;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AuthRepository repository;
    private final boolean forceSecureCookie;

    public AccessTokenService(AuthRepository repository,
                              @Value("${app.auth.secure-cookie:false}") boolean forceSecureCookie) {
        this.repository = repository;
        this.forceSecureCookie = forceSecureCookie;
    }

    public void issue(HttpServletRequest request, HttpServletResponse response, long userId) {
        rawToken(request).ifPresent(token -> repository.deleteAccessToken(hash(token)));
        long now = Instant.now().getEpochSecond();
        repository.deleteExpiredAccessTokens(now);

        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        repository.insertAccessToken(hash(token), userId, now + TOKEN_TTL.toSeconds());

        addCookie(response, token, TOKEN_TTL, isSecure(request));
        preventCaching(response);
    }

    public Optional<Long> resolveUserId(HttpServletRequest request) {
        return rawToken(request)
                .map(AccessTokenService::hash)
                .flatMap(tokenHash -> repository.findUserIdByAccessToken(tokenHash, Instant.now().getEpochSecond()));
    }

    public void revoke(HttpServletRequest request, HttpServletResponse response) {
        rawToken(request).ifPresent(token -> repository.deleteAccessToken(hash(token)));
        addCookie(response, "", Duration.ZERO, isSecure(request));
        preventCaching(response);
    }

    private Optional<String> rawToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return Optional.empty();
        for (Cookie cookie : cookies) {
            if (!COOKIE_NAME.equals(cookie.getName())) continue;
            String value = cookie.getValue();
            if (value != null && value.length() == ENCODED_TOKEN_LENGTH) return Optional.of(value);
            return Optional.empty();
        }
        return Optional.empty();
    }

    private void addCookie(HttpServletResponse response, String value, Duration maxAge, boolean secure) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private boolean isSecure(HttpServletRequest request) {
        if (forceSecureCookie || request.isSecure()) return true;
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        return forwardedProto != null && "https".equalsIgnoreCase(forwardedProto.split(",", 2)[0].trim());
    }

    private void preventCaching(HttpServletResponse response) {
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.setHeader(HttpHeaders.PRAGMA, "no-cache");
    }

    private static String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }
}
