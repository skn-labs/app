package app.skn.service;

import app.skn.auth.AuthRepository;
import app.skn.auth.CurrentUser;
import app.skn.common.ApiException;
import app.skn.data.SchemaScript;
import app.skn.data.SkincareRepository;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;

@Service
public class DemoService {
    private final SkincareRepository repository;
    private final DataSource dataSource;
    private final AuthRepository authRepository;
    private final CurrentUser currentUser;

    public DemoService(SkincareRepository repository, DataSource dataSource,
                       AuthRepository authRepository, CurrentUser currentUser) {
        this.repository = repository;
        this.dataSource = dataSource;
        this.authRepository = authRepository;
        this.currentUser = currentUser;
    }

    public void reset(String scenario) {
        if (!authRepository.findUser(currentUser.id()).orElseThrow().demo()) {
            throw ApiException.forbidden("DEMO_ONLY", "데모 계정에서만 시연 상태를 바꿀 수 있어요.");
        }
        if (!scenario.equals("default") && !scenario.equals("empty-experience") && !scenario.equals("cold-start")) {
            throw ApiException.invalid("INVALID_DEMO_SCENARIO", "지원하지 않는 시연 상태예요.");
        }
        repository.deleteDemoUserData();
        SchemaScript.reapply(dataSource);
        if ("empty-experience".equals(scenario)) repository.clearExperiencesForEmptyScenario();
        if ("cold-start".equals(scenario)) repository.clearAllPersonalDataForColdStart();
    }
}
