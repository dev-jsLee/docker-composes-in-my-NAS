// OIDC/SAML SSO Provider Server
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const cors = require('cors');
const helmet = require('helmet');
const Provider = require('oidc-provider');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Redis 클라이언트 설정
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379
  },
  password: process.env.REDIS_PASSWORD
});

redisClient.connect().catch(console.error);

// 미들웨어 설정
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.JWT_SECRET || 'your-secret-key',
  name: 'sso.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24시간
    domain: process.env.COOKIE_DOMAIN || undefined
  }
}));

// OIDC Provider 설정
const oidcConfig = {
  clients: [
    {
      client_id: 'webstation-client',
      client_secret: 'webstation-client-secret-change-in-production',
      redirect_uris: ['http://kwonluna.co.kr/auth/callback'],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      scope: 'openid profile email'
    }
  ],
  interactions: {
    url(ctx, interaction) {
      return `/interaction/${interaction.uid}`;
    }
  },
  cookies: {
    keys: [process.env.JWT_SECRET || 'your-secret-key']
  },
  claims: {
    openid: ['sub'],
    profile: ['name', 'family_name', 'given_name', 'preferred_username'],
    email: ['email', 'email_verified']
  },
  features: {
    devInteractions: { enabled: false },
    deviceFlow: { enabled: true },
    introspection: { enabled: true },
    revocation: { enabled: true }
  },
  ttl: {
    AccessToken: 1 * 60 * 60, // 1시간
    AuthorizationCode: 10 * 60, // 10분
    IdToken: 1 * 60 * 60, // 1시간
    DeviceCode: 10 * 60, // 10분
    RefreshToken: 1 * 24 * 60 * 60 // 1일
  }
};

// OIDC Provider 인스턴스 생성
const oidcProvider = new Provider(process.env.OIDC_ISSUER || 'http://localhost:3000', oidcConfig);

// OIDC Provider 마운트
app.use('/oidc', oidcProvider.callback());

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'sso-provider',
    timestamp: new Date().toISOString(),
    oidc: 'enabled'
  });
});

// 서비스 정보 엔드포인트
app.get('/service-info', (req, res) => {
  res.json({
    id: 'sso-provider',
    name: 'SSO Provider',
    description: 'OIDC/SAML Single Sign-On Provider',
    icon: '🔐',
    category: 'Authentication',
    version: '1.0.0',
    endpoints: {
      oidc: '/oidc',
      wellKnown: '/oidc/.well-known/openid_configuration'
    }
  });
});

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'DSM LDAP SSO Provider',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      serviceInfo: '/service-info',
      oidc: '/oidc',
      wellKnown: '/oidc/.well-known/openid_configuration'
    }
  });
});

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error('[SSO] 서버 오류:', err);
  res.status(500).json({ 
    success: false, 
    error: '서버 내부 오류가 발생했습니다.' 
  });
});

// 404 핸들링
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: '요청한 엔드포인트를 찾을 수 없습니다.' 
  });
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SSO] SSO Provider가 포트 ${PORT}에서 시작되었습니다.`);
  console.log(`[SSO] OIDC Issuer: ${process.env.OIDC_ISSUER || 'http://localhost:3000'}`);
  console.log(`[SSO] Redis 연결: ${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`);
  console.log(`[SSO] 환경: ${process.env.NODE_ENV || 'development'}`);
});

// 종료 처리
process.on('SIGTERM', async () => {
  console.log('[SSO] 서비스 종료 중...');
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[SSO] 서비스 종료 중...');
  await redisClient.quit();
  process.exit(0);
});
