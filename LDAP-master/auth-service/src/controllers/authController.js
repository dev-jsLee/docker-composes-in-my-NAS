// 인증 컨트롤러
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const ldapService = require('../services/ldap');
const redisService = require('../services/redis');

class AuthController {
  /**
   * 사용자 로그인
   */
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '입력 데이터가 유효하지 않습니다.',
          errors: errors.array()
        });
      }

      const { username, password } = req.body;

      // LDAP 인증 시도
      let user;
      try {
        user = await ldapService.authenticateUser(username, password);
        if (!user) {
          return res.status(401).json({
            success: false,
            message: '아이디 또는 비밀번호가 잘못되었습니다.'
          });
        }
      } catch (ldapError) {
        console.error('[AUTH] LDAP 인증 오류:', ldapError.message);
        return res.status(500).json({
          success: false,
          message: 'LDAP 인증 서버에 연결할 수 없습니다.'
        });
      }

      // JWT 토큰 생성
      const token = jwt.sign(
        {
          id: user.id || user.uid,
          username: user.username || user.uid,
          email: user.email,
          roles: user.roles || ['user']
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
      );

      // 세션에 사용자 정보 저장
      req.session.userId = user.id || user.uid;
      req.session.username = user.username || user.uid;
      req.session.email = user.email;
      req.session.roles = user.roles || ['user'];

      console.log(`[AUTH] 로그인 성공: ${user.username || user.uid}`);

      res.json({
        success: true,
        message: '로그인 성공',
        token,
        user: {
          id: user.id || user.uid,
          username: user.username || user.uid,
          email: user.email,
          roles: user.roles || ['user']
        }
      });

    } catch (error) {
      console.error('[AUTH] 로그인 처리 중 오류:', error);
      res.status(500).json({
        success: false,
        message: '로그인 처리 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 사용자 회원가입 (LDAP에 사용자 생성)
   */
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '입력 데이터가 유효하지 않습니다.',
          errors: errors.array()
        });
      }

      const { username, email, password, fullName } = req.body;

      // LDAP에 사용자 생성 시도
      try {
        const result = await ldapService.createUser({
          username,
          email,
          password,
          fullName: fullName || username
        });

        if (result.success) {
          console.log(`[AUTH] LDAP 회원가입 성공: ${username}`);
          
          res.json({
            success: true,
            message: 'LDAP에 회원가입이 완료되었습니다.',
            user: {
              username,
              email,
              fullName: fullName || username
            }
          });
        } else {
          res.status(400).json({
            success: false,
            message: result.message || '회원가입에 실패했습니다.'
          });
        }

      } catch (ldapError) {
        console.error('[AUTH] LDAP 회원가입 오류:', ldapError.message);
        res.status(500).json({
          success: false,
          message: 'LDAP 서버에 연결할 수 없습니다.'
        });
      }

    } catch (error) {
      console.error('[AUTH] 회원가입 처리 중 오류:', error);
      res.status(500).json({
        success: false,
        message: '회원가입 처리 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 사용자 프로필 조회
   */
  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      // LDAP에서 최신 사용자 정보 조회
      try {
        const user = await ldapService.getUserById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: '사용자를 찾을 수 없습니다.'
          });
        }

        res.json({
          success: true,
          user: {
            id: user.id || user.uid,
            username: user.username || user.uid,
            email: user.email,
            fullName: user.fullName || user.cn,
            roles: user.roles || ['user']
          }
        });

      } catch (ldapError) {
        console.error('[AUTH] LDAP 사용자 조회 오류:', ldapError.message);
        res.status(500).json({
          success: false,
          message: 'LDAP 서버에 연결할 수 없습니다.'
        });
      }

    } catch (error) {
      console.error('[AUTH] 프로필 조회 중 오류:', error);
      res.status(500).json({
        success: false,
        message: '프로필 조회 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 로그아웃
   */
  async logout(req, res) {
    try {
      const username = req.session.username;
      
      req.session.destroy((err) => {
        if (err) {
          console.error('[AUTH] 로그아웃 처리 중 오류:', err);
          res.status(500).json({
            success: false,
            message: '로그아웃 처리 중 오류가 발생했습니다.'
          });
        } else {
          console.log(`[AUTH] 로그아웃 성공: ${username}`);
          res.json({
            success: true,
            message: '로그아웃되었습니다.'
          });
        }
      });

    } catch (error) {
      console.error('[AUTH] 로그아웃 처리 중 오류:', error);
      res.status(500).json({
        success: false,
        message: '로그아웃 처리 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 토큰 검증
   */
  async verifyToken(req, res) {
    try {
      if (req.session.userId) {
        res.json({
          success: true,
          authenticated: true,
          user: {
            id: req.session.userId,
            username: req.session.username,
            email: req.session.email,
            roles: req.session.roles
          }
        });
      } else {
        res.status(401).json({
          success: false,
          authenticated: false,
          message: '인증되지 않은 사용자입니다.'
        });
      }

    } catch (error) {
      console.error('[AUTH] 토큰 검증 중 오류:', error);
      res.status(500).json({
        success: false,
        message: '토큰 검증 중 오류가 발생했습니다.'
      });
    }
  }
}

module.exports = new AuthController();
