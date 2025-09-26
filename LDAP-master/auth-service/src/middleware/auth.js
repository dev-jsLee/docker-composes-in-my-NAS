// 인증 미들웨어
const jwt = require('jsonwebtoken');

/**
 * JWT 토큰 인증 미들웨어
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '액세스 토큰이 필요합니다.'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: '유효하지 않은 토큰입니다.'
        });
      }

      req.user = user;
      next();
    });

  } catch (error) {
    console.error('[AUTH] 토큰 인증 오류:', error);
    res.status(500).json({
      success: false,
      message: '토큰 인증 처리 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 세션 기반 인증 미들웨어
 */
const authenticateSession = (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      req.user = {
        id: req.session.userId,
        username: req.session.username,
        email: req.session.email,
        roles: req.session.roles
      };
      next();
    } else {
      res.status(401).json({
        success: false,
        message: '로그인이 필요합니다.'
      });
    }

  } catch (error) {
    console.error('[AUTH] 세션 인증 오류:', error);
    res.status(500).json({
      success: false,
      message: '세션 인증 처리 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 역할 기반 접근 제어 미들웨어
 */
const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
      }

      const userRoles = req.user.roles || [];
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          message: '접근 권한이 없습니다.'
        });
      }

      next();

    } catch (error) {
      console.error('[AUTH] 역할 확인 오류:', error);
      res.status(500).json({
        success: false,
        message: '권한 확인 중 오류가 발생했습니다.'
      });
    }
  };
};

/**
 * 관리자 권한 확인 미들웨어
 */
const requireAdmin = requireRole(['admin']);

module.exports = {
  authenticateToken,
  authenticateSession,
  requireRole,
  requireAdmin
};
