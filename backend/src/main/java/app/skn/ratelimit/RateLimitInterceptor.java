package app.skn.ratelimit;

import app.skn.auth.CurrentUser;
import app.skn.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * OpenAI를 트리거하는 POST 요청에만 레이트리밋을 적용한다.
 * 식별은 인증된 사용자 기준이고, 액세스 토큰에서 userId를 못 얻는 경우에 한해 IP로 대체한다.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {
    private final RateLimiter limiter;
    private final CurrentUser currentUser;

    public RateLimitInterceptor(RateLimiter limiter, CurrentUser currentUser) {
        this.limiter = limiter;
        this.currentUser = currentUser;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) return true;
        RateLimiter.Decision decision = limiter.check(identity(request));
        if (decision.allowed()) return true;
        throw ApiException.tooManyRequests(decision.retryAfterSeconds());
    }

    private String identity(HttpServletRequest request) {
        return currentUser.optionalId()
                .map(id -> "user:" + id)
                .orElseGet(() -> "ip:" + clientIp(request));
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        String remote = request.getRemoteAddr();
        return remote == null ? "unknown" : remote;
    }
}
