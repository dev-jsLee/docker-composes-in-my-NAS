const express = require('express');
const { checkRedisConnection } = require('../services/redis');
const { checkLDAPConnection } = require('../services/ldap');

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: 서비스 헬스체크
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 서비스 정상
 *       503:
 *         description: 서비스 오류
 */
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'DSM LDAP 인증 서비스',
      version: '1.0.0',
      uptime: process.uptime(),
      checks: {}
    };

    // Redis 연결 체크
    try {
      await checkRedisConnection();
      healthCheck.checks.redis = 'ok';
    } catch (error) {
      healthCheck.checks.redis = 'error';
      healthCheck.status = 'degraded';
    }

    // LDAP 연결 체크
    try {
      await checkLDAPConnection();
      healthCheck.checks.ldap = 'ok';
    } catch (error) {
      healthCheck.checks.ldap = 'error';
      healthCheck.status = 'degraded';
    }

    // 메모리 사용량 체크
    const memUsage = process.memoryUsage();
    healthCheck.memory = {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    };

    // 환경 정보
    healthCheck.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV || 'development'
    };

    // 상태에 따른 HTTP 코드 결정
    const httpStatus = healthCheck.status === 'ok' ? 200 : 503;

    res.status(httpStatus).json(healthCheck);

  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: '헬스체크 실패',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: 서비스 준비 상태 체크
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 서비스 준비 완료
 *       503:
 *         description: 서비스 준비되지 않음
 */
router.get('/ready', async (req, res) => {
  try {
    // 기본적인 의존성 체크만 수행
    const checks = {
      redis: false,
      ldap: false
    };

    try {
      await checkRedisConnection();
      checks.redis = true;
    } catch (error) {
      // Redis 연결 실패 시 로그만 기록하고 계속 진행
    }

    try {
      await checkLDAPConnection();
      checks.ldap = true;
    } catch (error) {
      // LDAP 연결 실패 시 로그만 기록하고 계속 진행
    }

    const isReady = checks.redis && checks.ldap;

    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: checks
    });

  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: 서비스 활성 상태 체크
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 서비스 활성
 *       503:
 *         description: 서비스 비활성
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    live: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
