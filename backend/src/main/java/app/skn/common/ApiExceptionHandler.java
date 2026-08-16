package app.skn.common;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.slf4j.MDC;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);
    @ExceptionHandler(ApiException.class)
    ProblemDetail handleApi(ApiException error, HttpServletRequest request, HttpServletResponse response) {
        if (error.retryAfterSeconds() != null) {
            response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(error.retryAfterSeconds()));
        }
        return problem(error.status(), error.code(), error.getMessage(), request, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail handleValidation(MethodArgumentNotValidException error, HttpServletRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError fieldError : error.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return problem(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "입력 내용을 다시 확인해주세요.", request, fields);
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail handleUnexpected(Exception error, HttpServletRequest request) {
        log.error("Unhandled API error at {}", request.getRequestURI(), error);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "요청을 처리하지 못했어요. 입력은 유지한 채 다시 시도해주세요.", request, null);
    }

    private ProblemDetail problem(HttpStatus status, String code, String detail,
                                  HttpServletRequest request, Map<String, String> fields) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(status.getReasonPhrase());
        problem.setType(URI.create("https://skn.app/problems/" + code.toLowerCase()));
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", code);
        problem.setProperty("retryable", status.is5xxServerError());
        String traceId = MDC.get("traceId");
        if (traceId != null) problem.setProperty("traceId", traceId);
        if (fields != null) problem.setProperty("fieldErrors", fields);
        return problem;
    }
}
