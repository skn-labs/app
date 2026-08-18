package app.skn.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "app.openai")
public record OpenAiProperties(
        String apiKey,
        String model,
        List<String> fallbackModels,
        String reasoningEffort,
        Duration connectTimeout,
        Duration readTimeout,
        int maxOutputTokens,
        boolean webSearchEnabled,
        String webSearchContextSize
) {
    public boolean configured() {
        return apiKey != null && !apiKey.isBlank();
    }

    public List<String> modelPriority() {
        java.util.LinkedHashSet<String> models = new java.util.LinkedHashSet<>();
        if (model != null && !model.isBlank()) models.add(model.trim());
        if (fallbackModels != null) {
            fallbackModels.stream()
                    .filter(value -> value != null && !value.isBlank())
                    .map(String::trim)
                    .forEach(models::add);
        }
        return List.copyOf(models);
    }
}
