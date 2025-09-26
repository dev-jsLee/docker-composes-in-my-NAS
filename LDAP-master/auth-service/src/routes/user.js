const express = require('express');
const { param, query } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /user/profile:
 *   get:
 *     summary: 사용자 프로필 조회
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
 *       401:
 *         description: 인증 필요
 */
router.get('/profile', authenticateToken, userController.getProfile);

/**
 * @swagger
 * /user/{uid}:
 *   get:
 *     summary: 특정 사용자 정보 조회
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 UID
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       401:
 *         description: 인증 필요
 */
router.get('/:uid', authenticateToken, [
  param('uid')
    .trim()
    .notEmpty()
    .withMessage('사용자 UID를 입력해주세요.'),
  validateRequest
], userController.getUserByUid);

/**
 * @swagger
 * /user/search:
 *   get:
 *     summary: 사용자 검색
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: 검색 키워드 (이름, 이메일, 부서 등)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 최대 검색 결과 수
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 검색 시작 위치
 *     responses:
 *       200:
 *         description: 검색 성공
 *       401:
 *         description: 인증 필요
 */
router.get('/search', authenticateToken, [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('검색 키워드를 입력해주세요.'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit은 1-100 범위의 숫자여야 합니다.'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset은 0 이상의 숫자여야 합니다.'),
  validateRequest
], userController.searchUsers);

/**
 * @swagger
 * /user/{uid}/groups:
 *   get:
 *     summary: 사용자 그룹 조회
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *         description: 사용자 UID
 *     responses:
 *       200:
 *         description: 그룹 조회 성공
 *       404:
 *         description: 사용자를 찾을 수 없음
 *       401:
 *         description: 인증 필요
 */
router.get('/:uid/groups', authenticateToken, [
  param('uid')
    .trim()
    .notEmpty()
    .withMessage('사용자 UID를 입력해주세요.'),
  validateRequest
], userController.getUserGroups);

/**
 * @swagger
 * /user/update:
 *   put:
 *     summary: 사용자 정보 업데이트
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *                 description: 표시 이름
 *               email:
 *                 type: string
 *                 description: 이메일 주소
 *               department:
 *                 type: string
 *                 description: 부서
 *     responses:
 *       200:
 *         description: 정보 업데이트 성공
 *       400:
 *         description: 잘못된 요청
 *       401:
 *         description: 인증 필요
 */
router.put('/update', authenticateToken, [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('표시 이름은 1-100자여야 합니다.'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('올바른 이메일 주소를 입력해주세요.'),
  body('department')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('부서명은 1-100자여야 합니다.'),
  validateRequest
], userController.updateUser);

module.exports = router;
