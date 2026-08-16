package app.skn.auth;

import app.skn.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class CurrentUser {
    private static final String REQUEST_USER_ID = CurrentUser.class.getName() + ".USER_ID";
    private static final String REQUEST_AUTH_CHECKED = CurrentUser.class.getName() + ".AUTH_CHECKED";

    private final ObjectProvider<HttpServletRequest> requestProvider;
    private final AccessTokenService accessTokens;

    public CurrentUser(ObjectProvider<HttpServletRequest> requestProvider, AccessTokenService accessTokens) {
        this.requestProvider = requestProvider;
        this.accessTokens = accessTokens;
    }

    public long id() {
        return optionalId().orElseThrow(() -> new ApiException(
                HttpStatus.UNAUTHORIZED, "AUTH_REQUIRED", "로그인이 필요해요."));
    }

    public Optional<Long> optionalId() {
        HttpServletRequest request = requestProvider.getIfAvailable();
        if (request == null) return Optional.empty();
        Object cached = request.getAttribute(REQUEST_USER_ID);
        if (cached instanceof Number number) return Optional.of(number.longValue());
        if (Boolean.TRUE.equals(request.getAttribute(REQUEST_AUTH_CHECKED))) return Optional.empty();

        Optional<Long> resolved = accessTokens.resolveUserId(request);
        request.setAttribute(REQUEST_AUTH_CHECKED, true);
        resolved.ifPresent(userId -> request.setAttribute(REQUEST_USER_ID, userId));
        return resolved;
    }
}
