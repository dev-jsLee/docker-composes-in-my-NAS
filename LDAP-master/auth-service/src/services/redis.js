const redis = require('redis');
const winston = require('winston');

// Redis 클라이언트
let redisClient = null;
let isConnected = false;

// Redis 설정
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB) || 0,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      winston.error('Redis 서버 연결이 거부되었습니다.');
      return new Error('Redis 서버 연결 실패');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      winston.error('Redis 재연결 시도 시간 초과');
      return new Error('Redis 재연결 시간 초과');
    }
    if (options.attempt > 10) {
      winston.error('Redis 재연결 시도 횟수 초과');
      return undefined;
    }
    // 재연결 간격: 1초 + (시도횟수 * 0.5초)
    return Math.min(options.attempt * 500, 3000);
  }
};

// 키 접두사
const KEY_PREFIXES = {
  SESSION: 'sess:',
  TOKEN: 'token:',
  USER: 'user:',
  CACHE: 'cache:',
  BLACKLIST: 'blacklist:',
  RATE_LIMIT: 'ratelimit:'
};

// 만료 시간 (초)
const EXPIRY_TIMES = {
  SESSION: 24 * 60 * 60,        // 24시간
  TOKEN: 30 * 24 * 60 * 60,     // 30일
  CACHE: 60 * 60,               // 1시간
  BLACKLIST: 30 * 24 * 60 * 60, // 30일
  RATE_LIMIT: 60 * 15           // 15분
};

/**
 * Redis 클라이언트 초기화
 */
async function initializeRedis() {
  return new Promise((resolve, reject) => {
    try {
      redisClient = redis.createClient(redisConfig);

      // 이벤트 리스너 설정
      redisClient.on('connect', () => {
        winston.info('Redis에 연결되었습니다.');
      });

      redisClient.on('ready', () => {
        winston.info('Redis 클라이언트가 준비되었습니다.');
        isConnected = true;
        resolve();
      });

      redisClient.on('error', (err) => {
        winston.error('Redis 연결 오류:', err);
        isConnected = false;
      });

      redisClient.on('close', () => {
        winston.warn('Redis 연결이 종료되었습니다.');
        isConnected = false;
      });

      redisClient.on('reconnecting', () => {
        winston.info('Redis 재연결 중...');
      });

      // 연결
      redisClient.connect().catch(reject);

    } catch (error) {
      winston.error('Redis 클라이언트 초기화 실패:', error);
      reject(error);
    }
  });
}

/**
 * Redis 연결 상태 확인
 */
async function checkRedisConnection() {
  if (!redisClient || !isConnected) {
    throw new Error('Redis 클라이언트가 초기화되지 않았습니다.');
  }

  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    throw new Error(`Redis 연결 확인 실패: ${error.message}`);
  }
}

/**
 * 세션 저장
 */
async function saveSession(sessionId, sessionData, expiry = EXPIRY_TIMES.SESSION) {
  try {
    const key = `${KEY_PREFIXES.SESSION}${sessionId}`;
    const data = JSON.stringify(sessionData);

    await redisClient.setEx(key, expiry, data);
    winston.debug(`세션이 저장되었습니다: ${sessionId}`);
    return true;
  } catch (error) {
    winston.error('세션 저장 실패:', error);
    throw error;
  }
}

/**
 * 세션 조회
 */
async function getSession(sessionId) {
  try {
    const key = `${KEY_PREFIXES.SESSION}${sessionId}`;
    const data = await redisClient.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    winston.error('세션 조회 실패:', error);
    throw error;
  }
}

/**
 * 세션 삭제
 */
async function deleteSession(sessionId) {
  try {
    const key = `${KEY_PREFIXES.SESSION}${sessionId}`;
    const result = await redisClient.del(key);

    if (result > 0) {
      winston.debug(`세션이 삭제되었습니다: ${sessionId}`);
    }

    return result > 0;
  } catch (error) {
    winston.error('세션 삭제 실패:', error);
    throw error;
  }
}

/**
 * 토큰 저장
 */
async function saveToken(tokenId, tokenData, expiry = EXPIRY_TIMES.TOKEN) {
  try {
    const key = `${KEY_PREFIXES.TOKEN}${tokenId}`;
    const data = JSON.stringify(tokenData);

    await redisClient.setEx(key, expiry, data);
    winston.debug(`토큰이 저장되었습니다: ${tokenId}`);
    return true;
  } catch (error) {
    winston.error('토큰 저장 실패:', error);
    throw error;
  }
}

/**
 * 토큰 조회
 */
async function getToken(tokenId) {
  try {
    const key = `${KEY_PREFIXES.TOKEN}${tokenId}`;
    const data = await redisClient.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    winston.error('토큰 조회 실패:', error);
    throw error;
  }
}

/**
 * 토큰 삭제
 */
async function deleteToken(tokenId) {
  try {
    const key = `${KEY_PREFIXES.TOKEN}${tokenId}`;
    const result = await redisClient.del(key);

    if (result > 0) {
      winston.debug(`토큰이 삭제되었습니다: ${tokenId}`);
    }

    return result > 0;
  } catch (error) {
    winston.error('토큰 삭제 실패:', error);
    throw error;
  }
}

/**
 * 토큰 블랙리스트 추가
 */
async function addToBlacklist(token, expiry = EXPIRY_TIMES.BLACKLIST) {
  try {
    const key = `${KEY_PREFIXES.BLACKLIST}${token}`;
    await redisClient.setEx(key, expiry, 'revoked');
    winston.debug(`토큰이 블랙리스트에 추가되었습니다: ${token.substring(0, 10)}...`);
    return true;
  } catch (error) {
    winston.error('블랙리스트 추가 실패:', error);
    throw error;
  }
}

/**
 * 블랙리스트 확인
 */
async function isBlacklisted(token) {
  try {
    const key = `${KEY_PREFIXES.BLACKLIST}${token}`;
    const result = await redisClient.get(key);
    return result === 'revoked';
  } catch (error) {
    winston.error('블랙리스트 확인 실패:', error);
    return false;
  }
}

/**
 * 사용자 캐시 저장
 */
async function cacheUser(userId, userData, expiry = EXPIRY_TIMES.CACHE) {
  try {
    const key = `${KEY_PREFIXES.USER}${userId}`;
    const data = JSON.stringify(userData);

    await redisClient.setEx(key, expiry, data);
    winston.debug(`사용자 정보가 캐시되었습니다: ${userId}`);
    return true;
  } catch (error) {
    winston.error('사용자 캐시 저장 실패:', error);
    throw error;
  }
}

/**
 * 사용자 캐시 조회
 */
async function getCachedUser(userId) {
  try {
    const key = `${KEY_PREFIXES.USER}${userId}`;
    const data = await redisClient.get(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    winston.error('사용자 캐시 조회 실패:', error);
    throw error;
  }
}

/**
 * 사용자 캐시 삭제
 */
async function deleteCachedUser(userId) {
  try {
    const key = `${KEY_PREFIXES.USER}${userId}`;
    const result = await redisClient.del(key);

    if (result > 0) {
      winston.debug(`사용자 캐시가 삭제되었습니다: ${userId}`);
    }

    return result > 0;
  } catch (error) {
    winston.error('사용자 캐시 삭제 실패:', error);
    throw error;
  }
}

/**
 * 일반 캐시 저장
 */
async function setCache(key, data, expiry = EXPIRY_TIMES.CACHE) {
  try {
    const cacheKey = `${KEY_PREFIXES.CACHE}${key}`;
    const cacheData = JSON.stringify(data);

    await redisClient.setEx(cacheKey, expiry, cacheData);
    winston.debug(`캐시가 저장되었습니다: ${key}`);
    return true;
  } catch (error) {
    winston.error('캐시 저장 실패:', error);
    throw error;
  }
}

/**
 * 일반 캐시 조회
 */
async function getCache(key) {
  try {
    const cacheKey = `${KEY_PREFIXES.CACHE}${key}`;
    const data = await redisClient.get(cacheKey);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    winston.error('캐시 조회 실패:', error);
    throw error;
  }
}

/**
 * 일반 캐시 삭제
 */
async function deleteCache(key) {
  try {
    const cacheKey = `${KEY_PREFIXES.CACHE}${key}`;
    const result = await redisClient.del(cacheKey);

    if (result > 0) {
      winston.debug(`캐시가 삭제되었습니다: ${key}`);
    }

    return result > 0;
  } catch (error) {
    winston.error('캐시 삭제 실패:', error);
    throw error;
  }
}

/**
 * Rate limiting
 */
async function checkRateLimit(identifier, limit = 100, windowMs = 900000) {
  try {
    const key = `${KEY_PREFIXES.RATE_LIMIT}${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // 기존 요청들 조회
    const requests = await redisClient.zRangeByScore(key, windowStart, now, {
      WITHSCORES: true
    });

    // 요청 수 확인
    if (requests.length >= limit) {
      return {
        limited: true,
        remaining: 0,
        resetTime: new Date(now + windowMs).toISOString()
      };
    }

    // 새 요청 추가
    await redisClient.zAdd(key, { score: now, value: now.toString() });
    await redisClient.expire(key, Math.ceil(windowMs / 1000));

    return {
      limited: false,
      remaining: limit - requests.length - 1,
      resetTime: new Date(now + windowMs).toISOString()
    };
  } catch (error) {
    winston.error('Rate limit 확인 실패:', error);
    // 오류 시 제한하지 않음
    return { limited: false, remaining: limit };
  }
}

/**
 * 통계 정보 조회
 */
async function getStats() {
  try {
    const keys = await redisClient.keys(`${KEY_PREFIXES.SESSION}*`);
    const sessionCount = keys.length;

    const tokenKeys = await redisClient.keys(`${KEY_PREFIXES.TOKEN}*`);
    const tokenCount = tokenKeys.length;

    const info = await redisClient.info();
    const memoryInfo = info.match(/used_memory:(\d+)/);
    const memoryUsed = memoryInfo ? parseInt(memoryInfo[1]) : 0;

    return {
      sessions: sessionCount,
      tokens: tokenCount,
      memory_used: memoryUsed,
      uptime: info.uptime_in_seconds
    };
  } catch (error) {
    winston.error('통계 정보 조회 실패:', error);
    throw error;
  }
}

/**
 * 정리 작업
 */
async function cleanup() {
  try {
    winston.info('Redis 정리 작업 시작...');

    // 만료된 세션 삭제
    const sessionKeys = await redisClient.keys(`${KEY_PREFIXES.SESSION}*`);
    let deletedSessions = 0;
    for (const key of sessionKeys) {
      const ttl = await redisClient.ttl(key);
      if (ttl === -2) { // 키가 존재하지 않음
        await redisClient.del(key);
        deletedSessions++;
      }
    }

    // 만료된 토큰 삭제
    const tokenKeys = await redisClient.keys(`${KEY_PREFIXES.TOKEN}*`);
    let deletedTokens = 0;
    for (const key of tokenKeys) {
      const ttl = await redisClient.ttl(key);
      if (ttl === -2) {
        await redisClient.del(key);
        deletedTokens++;
      }
    }

    winston.info(`정리 완료: 세션 ${deletedSessions}개, 토큰 ${deletedTokens}개 삭제`);

    return { deletedSessions, deletedTokens };
  } catch (error) {
    winston.error('정리 작업 실패:', error);
    throw error;
  }
}

/**
 * 연결 종료
 */
async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
    winston.info('Redis 연결이 종료되었습니다.');
  }
}

// 프로세스 종료 시 정리
process.on('SIGINT', closeRedis);
process.on('SIGTERM', closeRedis);

module.exports = {
  initializeRedis,
  checkRedisConnection,
  saveSession,
  getSession,
  deleteSession,
  saveToken,
  getToken,
  deleteToken,
  addToBlacklist,
  isBlacklisted,
  cacheUser,
  getCachedUser,
  deleteCachedUser,
  setCache,
  getCache,
  deleteCache,
  checkRateLimit,
  getStats,
  cleanup,
  closeRedis,
  KEY_PREFIXES,
  EXPIRY_TIMES
};
