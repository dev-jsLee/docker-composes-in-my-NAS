// 입력 검증 미들웨어
const { validationResult } = require('express-validator');

/**
 * 검증 결과 확인 미들웨어
 */
const validateRequest = (req, res, next) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다.',
        errors: errors.array().map(error => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value
        }))
      });
    }

    next();

  } catch (error) {
    console.error('[VALIDATION] 검증 처리 중 오류:', error);
    res.status(500).json({
      success: false,
      message: '입력 검증 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 사용자 정의 검증 함수들
 */
const customValidators = {
  /**
   * 강력한 비밀번호 검증
   */
  isStrongPassword: (value) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    if (value.length < minLength) {
      throw new Error(`비밀번호는 최소 ${minLength}자 이상이어야 합니다.`);
    }

    if (!hasUpperCase) {
      throw new Error('비밀번호에 대문자가 포함되어야 합니다.');
    }

    if (!hasLowerCase) {
      throw new Error('비밀번호에 소문자가 포함되어야 합니다.');
    }

    if (!hasNumbers) {
      throw new Error('비밀번호에 숫자가 포함되어야 합니다.');
    }

    if (!hasSpecialChar) {
      throw new Error('비밀번호에 특수문자가 포함되어야 합니다.');
    }

    return true;
  },

  /**
   * 사용자명 검증
   */
  isValidUsername: (value) => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    
    if (!usernameRegex.test(value)) {
      throw new Error('사용자명은 3-20자의 영문, 숫자, 언더스코어, 하이픈만 사용 가능합니다.');
    }

    return true;
  },

  /**
   * 이메일 도메인 검증
   */
  isAllowedEmailDomain: (value) => {
    const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || [];
    
    if (allowedDomains.length === 0) {
      return true; // 제한이 없으면 모든 도메인 허용
    }

    const emailDomain = value.split('@')[1];
    
    if (!allowedDomains.includes(emailDomain)) {
      throw new Error(`허용되지 않은 이메일 도메인입니다. 허용된 도메인: ${allowedDomains.join(', ')}`);
    }

    return true;
  }
};

module.exports = {
  validateRequest,
  customValidators
};
