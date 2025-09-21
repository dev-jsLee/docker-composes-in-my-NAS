// Homepage + SSO 통합 서비스
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// 환경변수 설정
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Redis 클라이언트 설정
let redisClient;
try {
  redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  });
  redisClient.connect();
  console.log('Redis 클라이언트 연결 성공');
} catch (error) {
  console.error('Redis 연결 실패:', error.message);
  redisClient = null;
}

// Express 애플리케이션 생성
const app = express();

// 보안 미들웨어
app.use(helmet());

// CORS 설정
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15분
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 요청 수 제한
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }
});
app.use(limiter);

// 로깅
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 세션 설정
app.use(session({
  store: redisClient ? new RedisStore({ client: redisClient }) : undefined,
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  name: 'myapp.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true' || false,
    httpOnly: process.env.COOKIE_HTTP_ONLY === 'false' ? false : true,
    maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 24 * 60 * 60 * 1000, // 24시간
    domain: process.env.COOKIE_DOMAIN || undefined
  }
}));

// 서비스 디스커버리 미들웨어
const { serviceDiscoveryMiddleware } = require('./middleware/serviceDiscovery');
app.use(serviceDiscoveryMiddleware);

// 기본 라우트들
app.get('/', (req, res) => {
  res.json({
    message: 'Homepage SSO 서비스에 오신 것을 환영합니다!',
    version: '1.0.0',
    services: req.serviceDiscovery ? req.serviceDiscovery.getActiveServices() : [],
    session: req.session.userId ? { userId: req.session.userId } : null
  });
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    redis: redisClient ? 'connected' : 'disconnected'
  });
});

// 서비스 정보 엔드포인트 (자동 인식을 위해)
app.get('/service-info', (req, res) => {
  res.json({
    id: 'homepage-service',
    name: '홈페이지 서비스',
    description: 'SSO 인증이 통합된 홈페이지 서비스',
    version: '1.0.0',
    icon: '🏠',
    category: '대시보드',
    requiredRoles: ['user'],
    healthCheck: '/health',
    features: ['SSO 인증', '서비스 디스커버리', '대시보드']
  });
});

// 게시판 서비스 라우팅
app.get('/board', (req, res) => {
  res.json({
    service: '게시판',
    message: '게시판 서비스로 이동합니다.',
    authenticated: !!req.session.userId
  });
});

// 일정 공유 서비스 라우팅
app.get('/calendar', (req, res) => {
  res.json({
    service: '일정 공유',
    message: '일정 공유 서비스로 이동합니다.',
    authenticated: !!req.session.userId
  });
});

// 이미지 갤러리 서비스 라우팅
app.get('/gallery', (req, res) => {
  res.json({
    service: '이미지 갤러리',
    message: '이미지 갤러리 서비스로 이동합니다.',
    authenticated: !!req.session.userId
  });
});

// 인증 필요 페이지
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      error: '인증이 필요합니다.',
      loginUrl: '/login'
    });
  }

  res.json({
    message: '대시보드에 오신 것을 환영합니다!',
    userId: req.session.userId,
    userRoles: req.session.roles || ['user']
  });
});

// 로그인 페이지 (간단한 예시)
app.get('/login', (req, res) => {
  res.json({
    message: '로그인 페이지',
    note: '실제 구현에서는 HTML 폼이 필요합니다.'
  });
});

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: '서버 오류가 발생했습니다.',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: '페이지를 찾을 수 없습니다.',
    path: req.path
  });
});

// 포트 설정
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Homepage SSO 서비스가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Redis 상태: ${redisClient ? '연결됨' : '연결되지 않음'}`);
});

// 종료 시그널 처리
process.on('SIGTERM', async () => {
  console.log('SIGTERM 신호 수신. 서비스 종료 중...');
  if (redisClient) {
    await redisClient.disconnect();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT 신호 수신. 서비스 종료 중...');
  if (redisClient) {
    await redisClient.disconnect();
  }
  process.exit(0);
});

module.exports = app;
