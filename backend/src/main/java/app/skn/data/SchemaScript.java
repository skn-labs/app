package app.skn.data;

import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

import javax.sql.DataSource;

/**
 * schema.sql 을 다시 실행해 기준 데이터를 되돌린다.
 *
 * 문자셋을 반드시 UTF-8 로 지정한다. 지정하지 않으면 ResourceDatabasePopulator 가
 * JVM 플랫폼 기본 문자셋으로 파일을 읽어서, 한국어 Windows(MS949) 개발 환경에서는
 * '코덕님' 같은 시드 문자열이 깨진 채로 DB 에 들어간다. 리눅스 CI 는 기본이 UTF-8 이라
 * 통과하기 때문에 로컬에서만 재현되는 차이가 생긴다.
 */
public final class SchemaScript {
    private SchemaScript() {
    }

    public static void reapply(DataSource dataSource) {
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator(new ClassPathResource("schema.sql"));
        populator.setSqlScriptEncoding("UTF-8");
        populator.execute(dataSource);
    }
}
