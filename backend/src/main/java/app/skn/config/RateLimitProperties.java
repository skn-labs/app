package app.skn.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * AI 트리거 엔드포인트의 남용 방어(레이트리밋) 설정.
 * 목적은 명백한 남용자(짧은 시간의 과도한 반복 호출)만 막고 정상 사용자는 막지 않는 것이다.
 * 기본값은 넉넉하게 두고 필요 시 application 설정으로 조정한다.
 */
@ConfigurationProperties(prefix = "app.rate-limit")
public record RateLimitProperties(
        boolean enabled,
        int perMinute,
        int perHour,
        int perDay,
        int maxTrackedKeys
) {
    public RateLimitProperties {
        if (perMinute <= 0) perMinute = 10;
        if (perHour <= 0) perHour = 60;
        if (perDay <= 0) perDay = 200;
        if (maxTrackedKeys <= 0) maxTrackedKeys = 50_000;
    }
}
