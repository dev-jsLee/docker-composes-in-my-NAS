require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

// 서비스 모듈들
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const tokenRoutes = require('./routes/token');
const healthRoutes = require('./routes/health');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const { initializeRedis } = require('./services/redis');
const { initializeLDAP } = require('./services/ldap');

// 환경변수 검증
const requiredEnvVars = [
  'LDAP_URL',
  'LDAP_BASE_DN',
  'LDAP_BIND_DN',
  'LDAP_BIND_PASSWORD',
  'JWT_SECRET',
  'REDIS_HOST',
  'REDIS_PORT'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`환경변수 ${envVar}가 설정되지 않았습니다.`);
    process.exit(1);
  }
}

// Express 애플리케이션 생성
const app = express();
const PORT = process.env.PORT || 3000;

// 기본 설정
app.set('trust proxy', 1); // Nginx 뒤에서 실행될 경우

// 보안 미들웨어
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS 설정
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN ?
      process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001'];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS 정책에 의해 거부되었습니다.'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 로깅 미들웨어
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 요청 로깅
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15분
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 요청 수 제한
  message: {
    error: '요청 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 정적 파일 서빙
app.use('/static', express.static('public'));

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    service: 'DSM LDAP 인증 서비스',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/auth',
      user: '/user',
      token: '/token',
      health: '/health'
    }
  });
});

// API 라우트
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/token', tokenRoutes);
app.use('/health', healthRoutes);

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    error: '요청하신 엔드포인트를 찾을 수 없습니다.',
    path: req.originalUrl,
    method: req.method
  });
});

// 에러 핸들링 미들웨어
app.use(errorHandler);

// 서버 시작 함수
async function startServer() {
  try {
    console.log('🔧 서비스 초기화 중...');

    // Redis 초기화
    await initializeRedis();
    console.log('✅ Redis 연결 성공');

    // LDAP 초기화
    await initializeLDAP();
    console.log('✅ LDAP 연결 성공');

    // 서버 시작
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 인증 서비스가 포트 ${PORT}에서 시작되었습니다.`);
      console.log(`📱 헬스체크: http://localhost:${PORT}/health`);
      console.log(`📚 API 문서: http://localhost:${PORT}/`);
    });

    // 종료 시그널 처리
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 정상 종료 함수
async function gracefulShutdown(signal) {
  console.log(`\n🛑 ${signal} 시그널 수신. 서비스 종료 중...`);

  try {
    // 정리 작업 수행
    console.log('✅ 정리 작업 완료');

    // 1초 후 프로세스 종료
    setTimeout(() => {
      console.log('👋 서비스가 종료되었습니다.');
      process.exit(0);
    }, 1000);

  } catch (error) {
    console.error('❌ 종료 중 오류 발생:', error);
    process.exit(1);
  }
}

// 처리되지 않은 예외 처리
process.on('uncaughtException', (error) => {
  console.error('❌ 처리되지 않은 예외:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 처리되지 않은 Promise 거부:', reason);
  process.exit(1);
});

// 서버 시작
startServer().catch((error) => {
  console.error('❌ 서버 시작 중 치명적 오류:', error);
  process.exit(1);
});

module.exports = app;
