const express = require('express');
const { body } = require('express-validator');
const tokenController = require('../controllers/tokenController');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /token/introspect:
 *   post:
 *     summary: 토큰 정보 조회
 *     tags: [Token]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 검사할 토큰
 *     responses:
 *       200:
 *         description: 토큰 정보 조회 성공
 *       401:
 *         description: 토큰 유효하지 않음
 */
router.post('/introspect', authenticateToken, [
  body('token')
    .notEmpty()
    .withMessage('검사할 토큰이 필요합니다.'),
  validateRequest
], tokenController.introspectToken);

/**
 * @swagger
 * /token/revoke:
 *   post:
 *     summary: 토큰 폐기
 *     tags: [Token]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 폐기할 토큰
 *     responses:
 *       200:
 *         description: 토큰 폐기 성공
 *       401:
 *         description: 권한 없음
 */
router.post('/revoke', authenticateToken, [
  body('token')
    .notEmpty()
    .withMessage('폐기할 토큰이 필요합니다.'),
  validateRequest
], tokenController.revokeToken);

/**
 * @swagger
 * /token/revoke-all:
 *   post:
 *     summary: 모든 토큰 폐기
 *     tags: [Token]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 모든 토큰 폐기 성공
 *       401:
 *         description: 권한 없음
 */
router.post('/revoke-all', authenticateToken, tokenController.revokeAllTokens);

/**
 * @swagger
 * /token/active:
 *   get:
 *     summary: 활성 토큰 목록 조회
 *     tags: [Token]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 최대 조회 개수
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 조회 시작 위치
 *     responses:
 *       200:
 *         description: 토큰 목록 조회 성공
 *       401:
 *         description: 권한 없음
 */
router.get('/active', authenticateToken, [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit은 1-100 범위의 숫자여야 합니다.'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset은 0 이상의 숫자여야 합니다.'),
  validateRequest
], tokenController.getActiveTokens);

module.exports = router;
