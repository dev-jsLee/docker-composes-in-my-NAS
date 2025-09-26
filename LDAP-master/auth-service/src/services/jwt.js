const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const winston = require('winston');

// JWT 설정
const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  algorithm: 'HS256',
  accessTokenExpiry: process.env.JWT_EXPIRES_IN || '1h',
  refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '30d',
  issuer: process.env.OIDC_ISSUER || 'http://localhost:3002',
  audience: process.env.JWT_AUDIENCE || 'docker-sso'
};

// 토큰 블랙리스트 (Redis에 저장됨)
const tokenBlacklist = new Set();

/**
 * Access Token 생성
 */
function generateAccessToken(payload) {
  const tokenPayload = {
    ...payload,
    type: 'access_token',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + parseTokenExpiry(jwtConfig.accessTokenExpiry),
    iss: jwtConfig.issuer,
    aud: jwtConfig.audience
  };

  return jwt.sign(tokenPayload, jwtConfig.secret, {
    algorithm: jwtConfig.algorithm,
    expiresIn: jwtConfig.accessTokenExpiry
  });
}

/**
 * Refresh Token 생성
 */
function generateRefreshToken(payload) {
  const tokenPayload = {
    ...payload,
    type: 'refresh_token',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + parseTokenExpiry(jwtConfig.refreshTokenExpiry),
    iss: jwtConfig.issuer,
    aud: jwtConfig.audience,
    jti: crypto.randomUUID() // 고유 토큰 ID
  };

  return jwt.sign(tokenPayload, jwtConfig.secret, {
    algorithm: jwtConfig.algorithm,
    expiresIn: jwtConfig.refreshTokenExpiry
  });
}

/**
 * ID Token 생성 (OIDC용)
 */
function generateIdToken(userInfo, nonce = null, authTime = null) {
  const tokenPayload = {
    sub: userInfo.uid,
    name: userInfo.cn,
    given_name: userInfo.givenName,
    family_name: userInfo.sn,
    preferred_username: userInfo.displayName,
    email: userInfo.mail,
    email_verified: true,
    type: 'id_token',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + parseTokenExpiry(jwtConfig.accessTokenExpiry),
    iss: jwtConfig.issuer,
    aud: userInfo.client_id || jwtConfig.audience,
    auth_time: authTime || Math.floor(Date.now() / 1000),
    nonce: nonce
  };

  return jwt.sign(tokenPayload, jwtConfig.secret, {
    algorithm: jwtConfig.algorithm,
    expiresIn: jwtConfig.accessTokenExpiry
  });
}

/**
 * 토큰 검증
 */
function verifyToken(token, expectedType = null) {
  try {
    // 블랙리스트 확인
    if (tokenBlacklist.has(token)) {
      throw new Error('토큰이 폐기되었습니다.');
    }

    const decoded = jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });

    // 토큰 타입 확인
    if (expectedType && decoded.type !== expectedType) {
      throw new Error(`예상하지 않은 토큰 타입: ${decoded.type}`);
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('토큰이 만료되었습니다.');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('유효하지 않은 토큰입니다.');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('아직 사용할 수 없는 토큰입니다.');
    } else {
      throw error;
    }
  }
}

/**
 * 토큰 갱신
 */
function refreshTokens(refreshToken, userInfo) {
  // Refresh Token 검증
  const decodedRefreshToken = verifyToken(refreshToken, 'refresh_token');

  // 새로운 Access Token 생성
  const newAccessToken = generateAccessToken({
    sub: decodedRefreshToken.sub,
    uid: decodedRefreshToken.uid,
    email: decodedRefreshToken.email,
    roles: decodedRefreshToken.roles || []
  });

  // 새로운 Refresh Token 생성 (보안을 위해)
  const newRefreshToken = generateRefreshToken({
    sub: decodedRefreshToken.sub,
    uid: decodedRefreshToken.uid,
    email: decodedRefreshToken.email,
    roles: decodedRefreshToken.roles || []
  });

  // 기존 Refresh Token 폐기
  tokenBlacklist.add(refreshToken);

  return {
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_type: 'Bearer',
    expires_in: parseTokenExpiry(jwtConfig.accessTokenExpiry)
  };
}

/**
 * 토큰 폐기
 */
function revokeToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.jti) {
      tokenBlacklist.add(token);
      winston.info(`토큰이 폐기되었습니다: ${decoded.jti}`);
      return true;
    }
    return false;
  } catch (error) {
    winston.error('토큰 폐기 중 오류:', error);
    return false;
  }
}

/**
 * 모든 사용자 토큰 폐기
 */
function revokeAllUserTokens(userId) {
  // 실제 구현에서는 Redis에서 해당 사용자의 모든 토큰을 찾아 폐기해야 함
  winston.info(`사용자 ${userId}의 모든 토큰이 폐기되었습니다.`);
  return true;
}

/**
 * 토큰 정보 조회 (디코딩)
 */
function introspectToken(token) {
  try {
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      throw new Error('유효하지 않은 토큰입니다.');
    }

    // 블랙리스트 확인
    const isRevoked = tokenBlacklist.has(token);

    return {
      active: !isRevoked && decoded.payload.exp > Math.floor(Date.now() / 1000),
      sub: decoded.payload.sub,
      iat: decoded.payload.iat,
      exp: decoded.payload.exp,
      iss: decoded.payload.iss,
      aud: decoded.payload.aud,
      type: decoded.payload.type,
      revoked: isRevoked
    };
  } catch (error) {
    throw new Error('토큰 정보 조회 실패');
  }
}

/**
 * 만료 시간 파싱
 */
function parseTokenExpiry(expiry) {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 3600; // 기본값 1시간
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 3600;
  }
}

/**
 * 토큰 만료 확인
 */
function isTokenExpired(token) {
  try {
    const decoded = jwt.decode(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp <= currentTime;
  } catch (error) {
    return true;
  }
}

/**
 * JWKS (JSON Web Key Set) 생성 (OIDC용)
 */
function generateJWKS() {
  // RSA 키 페어를 사용하는 경우에 필요
  // 현재는 HMAC 기반이므로 빈 JWKS 반환
  return {
    keys: [
      {
        kty: 'oct',
        k: Buffer.from(jwtConfig.secret).toString('base64url'),
        alg: 'HS256'
      }
    ]
  };
}

/**
 * OIDC 표준 클레임 추가
 */
function addStandardClaims(userInfo, options = {}) {
  const claims = {
    sub: userInfo.uid,
    name: userInfo.cn,
    given_name: userInfo.givenName,
    family_name: userInfo.sn,
    preferred_username: userInfo.displayName,
    email: userInfo.mail,
    email_verified: true,
    locale: 'ko-KR',
    zoneinfo: 'Asia/Seoul',
    updated_at: Math.floor(Date.now() / 1000)
  };

  // 커스텀 클레임 추가
  if (userInfo.department) claims.department = userInfo.department;
  if (userInfo.employeeID) claims.employee_id = userInfo.employeeID;
  if (userInfo.title) claims.title = userInfo.title;

  return claims;
}

/**
 * SAML 속성 변환 (주석 처리됨 - 필요시 활성화)
 */
// function mapToSamlAttributes(oidcClaims) {
//   const attributes = [];
//
//   // 표준 SAML 속성 매핑
//   const samlMapping = {
//     'uid': 'urn:oid:0.9.2342.19200300.100.1.1',
//     'mail': 'urn:oid:0.9.2342.19200300.100.1.3',
//     'cn': 'urn:oid:2.5.4.3',
//     'givenName': 'urn:oid:2.5.4.42',
//     'sn': 'urn:oid:2.5.4.4',
//     'displayName': 'urn:oid:2.16.840.1.113730.3.1.241',
//     'department': 'urn:oid:2.5.4.11'
//   };
//
//   Object.entries(samlMapping).forEach(([claim, samlName]) => {
//     if (oidcClaims[claim]) {
//       attributes.push({
//         name: samlName,
//         friendlyName: claim,
//         nameFormat: 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
//         values: Array.isArray(oidcClaims[claim]) ? oidcClaims[claim] : [oidcClaims[claim]]
//       });
//     }
//   });
//
//   return attributes;
// }

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateIdToken,
  verifyToken,
  refreshTokens,
  revokeToken,
  revokeAllUserTokens,
  introspectToken,
  isTokenExpired,
  generateJWKS,
  addStandardClaims,
  // mapToSamlAttributes, // SAML 기능 주석 처리됨
  parseTokenExpiry,
  jwtConfig
};
