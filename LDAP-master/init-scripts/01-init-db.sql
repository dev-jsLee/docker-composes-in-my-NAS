-- SSO 데이터베이스 초기화 스크립트
-- PostgreSQL 15용

-- 클라이언트 애플리케이션 정보 테이블
CREATE TABLE IF NOT EXISTS oauth_clients (
    id SERIAL PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL UNIQUE,
    client_secret VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    redirect_uris TEXT[] NOT NULL,
    grant_types VARCHAR(255)[] DEFAULT ARRAY['authorization_code'],
    response_types VARCHAR(255)[] DEFAULT ARRAY['code'],
    scope VARCHAR(255) DEFAULT 'openid profile email',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OIDC 토큰 저장 테이블
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id SERIAL PRIMARY KEY,
    access_token TEXT NOT NULL UNIQUE,
    refresh_token TEXT UNIQUE,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scope VARCHAR(255),
    client_id VARCHAR(255) REFERENCES oauth_clients(client_id),
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SAML 서비스 프로바이더 정보 테이블 (주석 처리됨 - 필요시 활성화)
-- CREATE TABLE IF NOT EXISTS saml_service_providers (
--     id SERIAL PRIMARY KEY,
--     entity_id VARCHAR(255) NOT NULL UNIQUE,
--     acs_url TEXT NOT NULL,
--     slo_url TEXT,
--     name_id_format VARCHAR(255) DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
--     certificate TEXT,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- LDAP 사용자 캐시 테이블
CREATE TABLE IF NOT EXISTS ldap_user_cache (
    id SERIAL PRIMARY KEY,
    ldap_uid VARCHAR(255) NOT NULL UNIQUE,
    ldap_dn VARCHAR(500) NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(255),
    given_name VARCHAR(255),
    family_name VARCHAR(255),
    department VARCHAR(255),
    employee_id VARCHAR(255),
    groups TEXT[],
    raw_data JSONB,
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 세션 로그 테이블
CREATE TABLE IF NOT EXISTS auth_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    client_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL, -- login, logout, token_refresh, etc.
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_access_token ON oauth_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_refresh_token ON oauth_tokens(refresh_token);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_client_id ON oauth_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_ldap_user_cache_email ON ldap_user_cache(email);
CREATE INDEX IF NOT EXISTS idx_ldap_user_cache_last_sync ON ldap_user_cache(last_sync);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);

-- 기본 클라이언트 애플리케이션 추가 (예시)
INSERT INTO oauth_clients (client_id, client_secret, client_name, redirect_uris, scope)
VALUES (
    'your-oidc-client-id',
    'your-oidc-client-secret',
    'Docker SSO Client',
    ARRAY['http://localhost:3003/callback', 'http://localhost:3003/auth/callback'],
    'openid profile email'
) ON CONFLICT (client_id) DO NOTHING;

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거
CREATE TRIGGER update_oauth_clients_updated_at BEFORE UPDATE ON oauth_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SAML 관련 트리거 (주석 처리됨 - 필요시 활성화)
-- CREATE TRIGGER update_saml_service_providers_updated_at BEFORE UPDATE ON saml_service_providers
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 권한 설정
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sso_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO sso_user;

-- 통계 뷰
CREATE OR REPLACE VIEW auth_stats AS
SELECT
    DATE_TRUNC('hour', created_at) as hour,
    event_type,
    COUNT(*) as count
FROM auth_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), event_type
ORDER BY hour DESC;

COMMENT ON VIEW auth_stats IS '최근 24시간 인증 통계';

-- 만료된 토큰 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM oauth_tokens WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_tokens() IS '만료된 토큰 정리 (주기적으로 실행 필요)';
