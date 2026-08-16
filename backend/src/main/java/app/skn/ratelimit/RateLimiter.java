package app.skn.ratelimit;

import app.skn.config.RateLimitProperties;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 인메모리 고정 윈도우 카운터로 사용자(또는 IP)별 요청 수를 분/시/일 단위로 센다.
 * 외부 의존성 없이 순수 자바로 동작하고 서버 재시작 시 초기화된다.
 * 스레드 안전을 위해 키별 카운터 갱신은 짧게 동기화하고, 오래된 항목은 주기적으로 정리해 메모리 누수를 막는다.
 */
@Component
public class RateLimiter {
    private static final long MINUTE_MILLIS = 60_000L;
    private static final long HOUR_MILLIS = 60 * MINUTE_MILLIS;
    private static final long DAY_MILLIS = 24 * HOUR_MILLIS;

    private final RateLimitProperties properties;
    private final Clock clock;
    private final ConcurrentHashMap<String, Counters> buckets = new ConcurrentHashMap<>();
    private final AtomicLong lastCleanup = new AtomicLong(0);

    public RateLimiter(RateLimitProperties properties) {
        this.properties = properties;
        this.clock = Clock.systemUTC();
    }

    public Decision check(String key) {
        if (!properties.enabled()) return Decision.ALLOWED;
        long now = clock.millis();
        maybeCleanup(now);
        Counters counters = buckets.computeIfAbsent(key, ignored -> new Counters());
        return counters.tryAcquire(now, properties);
    }

    private void maybeCleanup(long now) {
        long previous = lastCleanup.get();
        if (now - previous < HOUR_MILLIS && buckets.size() < properties.maxTrackedKeys()) return;
        if (!lastCleanup.compareAndSet(previous, now)) return;
        Iterator<Map.Entry<String, Counters>> iterator = buckets.entrySet().iterator();
        while (iterator.hasNext()) {
            Counters counters = iterator.next().getValue();
            if (now - counters.lastAccess() > DAY_MILLIS) iterator.remove();
        }
    }

    public record Decision(boolean allowed, long retryAfterSeconds) {
        static final Decision ALLOWED = new Decision(true, 0);

        static Decision denied(long retryAfterSeconds) {
            return new Decision(false, Math.max(1, retryAfterSeconds));
        }
    }

    /** 키 하나의 분/시/일 고정 윈도우 상태. 갱신은 인스턴스 락으로 직렬화한다. */
    private static final class Counters {
        private long minuteWindow = -1;
        private long hourWindow = -1;
        private long dayWindow = -1;
        private int minuteCount;
        private int hourCount;
        private int dayCount;
        private volatile long lastAccess;

        synchronized Decision tryAcquire(long now, RateLimitProperties limits) {
            lastAccess = now;
            long minute = now / MINUTE_MILLIS;
            long hour = now / HOUR_MILLIS;
            long day = now / DAY_MILLIS;
            if (minute != minuteWindow) { minuteWindow = minute; minuteCount = 0; }
            if (hour != hourWindow) { hourWindow = hour; hourCount = 0; }
            if (day != dayWindow) { dayWindow = day; dayCount = 0; }

            long retryAfter = 0;
            if (minuteCount >= limits.perMinute()) retryAfter = Math.max(retryAfter, secondsUntilNext(now, MINUTE_MILLIS));
            if (hourCount >= limits.perHour()) retryAfter = Math.max(retryAfter, secondsUntilNext(now, HOUR_MILLIS));
            if (dayCount >= limits.perDay()) retryAfter = Math.max(retryAfter, secondsUntilNext(now, DAY_MILLIS));
            if (retryAfter > 0) return Decision.denied(retryAfter);

            minuteCount++;
            hourCount++;
            dayCount++;
            return Decision.ALLOWED;
        }

        long lastAccess() {
            return lastAccess;
        }

        private static long secondsUntilNext(long now, long windowMillis) {
            long nextStart = ((now / windowMillis) + 1) * windowMillis;
            return (long) Math.ceil((nextStart - now) / 1000.0);
        }
    }
}
