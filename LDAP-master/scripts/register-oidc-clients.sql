-- OIDC 클라이언트 등록 스크립트
-- 마이크로 서비스들을 위한 OIDC 클라이언트 등록

-- ================================
-- 기존 클라이언트 확인 및 정리
-- ================================
DELETE FROM oauth_clients WHERE client_id IN (
    'user-service-client',
    'product-service-client',
    'order-service-client'
);

-- ================================
-- 사용자 관리 서비스 클라이언트
-- ================================
INSERT INTO oauth_clients (
    client_id,
    client_secret,
    client_name,
    redirect_uris,
    grant_types,
    response_types,
    scope
) VALUES (
    'user-service-client',
    'user-service-client-secret-change-in-production',
    '사용자 관리 서비스',
    ARRAY[
        'http://localhost:3003/auth/callback',
        'http://user-service:3000/auth/callback',
        'http://localhost:3003/oidc/callback'
    ],
    ARRAY['authorization_code'],
    ARRAY['code'],
    'openid profile email'
) ON CONFLICT (client_id) DO NOTHING;

-- ================================
-- 제품 관리 서비스 클라이언트
-- ================================
INSERT INTO oauth_clients (
    client_id,
    client_secret,
    client_name,
    redirect_uris,
    grant_types,
    response_types,
    scope
) VALUES (
    'product-service-client',
    'product-service-client-secret-change-in-production',
    '제품 관리 서비스',
    ARRAY[
        'http://localhost:3004/auth/callback',
        'http://product-service:3000/auth/callback',
        'http://localhost:3004/oidc/callback'
    ],
    ARRAY['authorization_code'],
    ARRAY['code'],
    'openid profile email'
) ON CONFLICT (client_id) DO NOTHING;

-- ================================
-- 주문 관리 서비스 클라이언트
-- ================================
INSERT INTO oauth_clients (
    client_id,
    client_secret,
    client_name,
    redirect_uris,
    grant_types,
    response_types,
    scope
) VALUES (
    'order-service-client',
    'order-service-client-secret-change-in-production',
    '주문 관리 서비스',
    ARRAY[
        'http://localhost:3005/auth/callback',
        'http://order-service:3000/auth/callback',
        'http://localhost:3005/oidc/callback'
    ],
    ARRAY['authorization_code'],
    ARRAY['code'],
    'openid profile email'
) ON CONFLICT (client_id) DO NOTHING;

-- ================================
-- 등록 확인
-- ================================
SELECT
    client_id,
    client_name,
    array_to_string(redirect_uris, ', ') as redirect_uris,
    scope,
    created_at
FROM oauth_clients
WHERE client_id LIKE '%-service-client'
ORDER BY client_id;

-- ================================
-- 클라이언트 시크릿 확인 (보안을 위해 실제 운영시에는 별도 관리)
-- ================================
SELECT
    client_id,
    client_name,
    '***HIDDEN***' as client_secret,
    created_at
FROM oauth_clients
WHERE client_id LIKE '%-service-client'
ORDER BY client_id;
