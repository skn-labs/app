package app.skn.api;

import app.skn.api.ApiModels.ApiMessage;
import app.skn.api.ApiModels.NotificationInboxView;
import app.skn.api.ApiModels.NotificationView;
import app.skn.api.ApiModels.SnoozeNotificationRequest;
import app.skn.service.SkincareService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/notifications")
public class NotificationController {
    private final SkincareService service;

    public NotificationController(SkincareService service) {
        this.service = service;
    }

    @GetMapping
    NotificationInboxView inbox() {
        return service.notifications();
    }

    @PostMapping("/{id}/read")
    NotificationView read(@PathVariable long id) {
        return service.readNotification(id);
    }

    @PostMapping("/{id}/snooze")
    NotificationView snooze(@PathVariable long id,
                            @Valid @RequestBody SnoozeNotificationRequest request) {
        return service.snoozeNotification(id, request);
    }

    @PostMapping("/read-all")
    ApiMessage readAll() {
        return service.readAllNotifications();
    }
}
