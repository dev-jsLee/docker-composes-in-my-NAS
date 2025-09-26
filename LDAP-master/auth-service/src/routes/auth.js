const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 사용자 로그인
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 사용자 아이디
 *               password:
 *                 type: string
 *                 description: 비밀번호
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       401:
 *         description: 인증 실패
 */
router.post('/login', [
  body('username')
    .trim()
    .isLength({ min: 1 })
    .withMessage('사용자 아이디를 입력해주세요.'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('비밀번호를 입력해주세요.'),
  validateRequest
], authController.login);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: 사용자 회원가입
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 description: 사용자 아이디
 *               password:
 *                 type: string
 *                 description: 비밀번호
 *               email:
 *                 type: string
 *                 description: 이메일 주소
 *               displayName:
 *                 type: string
 *                 description: 표시 이름
 *               department:
 *                 type: string
 *                 description: 부서
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 잘못된 요청
 */
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('사용자 아이디는 3-50자의 영문, 숫자, 밑줄, 하이픈만 사용 가능합니다.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('비밀번호는 최소 8자 이상이어야 합니다.'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('올바른 이메일 주소를 입력해주세요.'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('표시 이름은 1-100자여야 합니다.'),
  body('department')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('부서명은 1-100자여야 합니다.'),
  validateRequest
], authController.register);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 로그아웃
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *       401:
 *         description: 인증 필요
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * @swagger
 * /auth/verify:
 *   get:
 *     summary: 토큰 유효성 검증
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 토큰 유효
 *       401:
 *         description: 토큰 무효
 */
router.get('/verify', authenticateToken, authController.verifyToken);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: 토큰 갱신
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 리프레시 토큰
 *     responses:
 *       200:
 *         description: 토큰 갱신 성공
 *       401:
 *         description: 토큰 무효
 */
router.post('/refresh', [
  body('refreshToken')
    .notEmpty()
    .withMessage('리프레시 토큰이 필요합니다.'),
  validateRequest
], authController.refreshToken);

/**
 * @swagger
 * /auth/password-reset:
 *   post:
 *     summary: 비밀번호 재설정 요청
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 description: 사용자 이메일
 *     responses:
 *       200:
 *         description: 비밀번호 재설정 메일 발송됨
 *       400:
 *         description: 잘못된 이메일
 */
router.post('/password-reset', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('올바른 이메일 주소를 입력해주세요.'),
  validateRequest
], authController.requestPasswordReset);

/**
 * @swagger
 * /auth/password-reset/{token}:
 *   post:
 *     summary: 비밀번호 재설정
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: 재설정 토큰
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 description: 새 비밀번호
 *     responses:
 *       200:
 *         description: 비밀번호 재설정 성공
 *       400:
 *         description: 잘못된 토큰 또는 비밀번호
 */
router.post('/password-reset/:token', [
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('새 비밀번호는 최소 8자 이상이어야 합니다.'),
  validateRequest
], authController.resetPassword);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: 비밀번호 변경
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: 현재 비밀번호
 *               newPassword:
 *                 type: string
 *                 description: 새 비밀번호
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 *       400:
 *         description: 잘못된 비밀번호
 *       401:
 *         description: 인증 필요
 */
router.post('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('현재 비밀번호를 입력해주세요.'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('새 비밀번호는 최소 8자 이상이어야 합니다.'),
  validateRequest
], authController.changePassword);

module.exports = router;
