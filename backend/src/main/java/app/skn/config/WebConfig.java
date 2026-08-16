package app.skn.config;

import app.skn.auth.AuthInterceptor;
import app.skn.ratelimit.RateLimitInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final AuthInterceptor authInterceptor;
    private final RateLimitInterceptor rateLimitInterceptor;

    public WebConfig(AuthInterceptor authInterceptor, RateLimitInterceptor rateLimitInterceptor) {
        this.authInterceptor = authInterceptor;
        this.rateLimitInterceptor = rateLimitInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/v1/**")
                .excludePathPatterns(
                        "/api/v1/auth/signup",
                        "/api/v1/auth/login",
                        "/api/v1/auth/demo",
                        "/api/v1/auth/quick-accounts",
                        "/api/v1/auth/quick-login/**"
                );
        // OpenAI 를 트리거하는 AI 대화 POST 경로만 남용 방어 대상으로 둔다. 인증 이후에 실행되도록 뒤에 등록한다.
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/api/v1/ai/conversations/**", "/api/v1/ai/conversations");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
