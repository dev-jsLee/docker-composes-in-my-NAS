// 간단한 인증 서버 (Redis 없이)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 서비스 정보 엔드포인트
app.get('/service-info', (req, res) => {
  res.json({
    id: 'auth-service',
    name: '인증 서비스',
    description: 'DSM LDAP 연동 인증 및 세션 관리',
    icon: '🔐',
    category: '인증',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      login: '/api/auth/login',
      register: '/api/auth/register',
      verify: '/api/auth/verify'
    }
  });
});

// 기본 API 엔드포인트들
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // 테스트용 로그인
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      message: '로그인 성공 (테스트)',
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@kwonluna.co.kr',
        roles: ['admin', 'user']
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: '아이디 또는 비밀번호가 잘못되었습니다.'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: '필수 필드가 누락되었습니다.'
    });
  }
  
  // 테스트용 회원가입
  res.json({
    success: true,
    message: '회원가입 성공 (테스트)',
    user: {
      username,
      email,
      roles: ['user']
    }
  });
});

app.get('/api/auth/verify', (req, res) => {
  // 테스트용 토큰 검증
  res.json({
    success: true,
    authenticated: false,
    message: '테스트 모드 - 인증 비활성화'
  });
});

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'DSM LDAP 인증 서비스',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      serviceInfo: '/service-info',
      api: '/api/auth/*'
    }
  });
});

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error('[AUTH] 서버 오류:', err);
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
  console.log(`[AUTH] 인증 서비스가 포트 ${PORT}에서 시작되었습니다.`);
  console.log(`[AUTH] 모드: 간단한 테스트 모드 (Redis/LDAP 비활성화)`);
  console.log(`[AUTH] 환경: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[AUTH] 테스트 계정: admin / admin123`);
});

// 종료 처리
process.on('SIGTERM', () => {
  console.log('[AUTH] 서비스 종료 중...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[AUTH] 서비스 종료 중...');
  process.exit(0);
});
