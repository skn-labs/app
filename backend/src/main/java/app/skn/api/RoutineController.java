package app.skn.api;

import app.skn.api.ApiModels.*;
import app.skn.service.SkincareService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me/routines")
public class RoutineController {
    private final SkincareService service;

    public RoutineController(SkincareService service) {
        this.service = service;
    }

    @GetMapping("/current")
    RoutineView current() {
        return service.currentRoutine();
    }

    @GetMapping("/baseline")
    RoutineView baseline() {
        return service.baselineRoutine();
    }

    @GetMapping("/{routineId}")
    RoutineView routine(@PathVariable long routineId) {
        return service.routine(routineId);
    }

    @PutMapping("/current")
    ExperienceView replace(
            @Valid @RequestBody UpdateRoutineRequest request,
            @RequestHeader("Idempotency-Key") String clientRequestId
    ) {
        return service.replaceRoutine(request, clientRequestId);
    }

    @PostMapping("/{routineId}/name-suggestion")
    RoutineNameSuggestionView suggestName(@PathVariable long routineId) {
        return service.suggestRoutineName(routineId);
    }

    @PutMapping("/{routineId}/name")
    RoutineView rename(@PathVariable long routineId, @Valid @RequestBody RenameRoutineRequest request) {
        return service.renameCurrentRoutine(routineId, request);
    }
}
