package app.skn.ai;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class PromptFactory {
    public static final String VERSION = "chat-v5-user-language-only";

    private final String shared;
    private final Map<String, String> modes;

    public PromptFactory() {
        shared = read("prompts/shared-v1.txt");
        modes = Map.of(
                "PRODUCT", read("prompts/product-v1.txt"),
                "RECOMMEND", read("prompts/recommend-v1.txt"),
                "PATTERN", read("prompts/pattern-v1.txt"),
                "RESCUE", read("prompts/rescue-v1.txt"),
                "GENERAL", read("prompts/general-v1.txt")
        );
    }

    public String instructions(String mode) {
        return shared + "\n\n" + modes.getOrDefault(mode, modes.get("GENERAL")) + "\n\n프롬프트 버전: " + VERSION;
    }

    private String read(String path) {
        try {
            return new ClassPathResource(path).getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException error) {
            throw new IllegalStateException("프롬프트 리소스를 읽을 수 없습니다: " + path, error);
        }
    }
}
