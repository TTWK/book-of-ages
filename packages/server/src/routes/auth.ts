/**
 * 会话路由：以 X-API-Key 请求头换取短时会话 cookie
 *
 * 用途：浏览器媒体加载（材料预览 <img>、快照 <iframe>）无法携带自定义请求头，
 * 读接口在鉴权后额外接受会话 cookie。会话与钥匙同权（scope 随钥匙），
 * 吊销钥匙即时失效（每次请求回查钥匙状态）。
 */

import { FastifyInstance } from 'fastify';
import {
  requireHeaderAuth,
  requireReadScope,
  issueSessionCookie,
  clearSessionCookie,
} from '../middleware/auth';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // 建立会话（header 鉴权 → Set-Cookie）
  fastify.post('/api/auth/session', { preHandler: requireHeaderAuth }, issueSessionCookie);

  // 清除会话（任意凭证来源均可注销）
  fastify.delete('/api/auth/session', { preHandler: requireReadScope }, clearSessionCookie);
}
