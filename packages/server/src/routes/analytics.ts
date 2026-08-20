/**
 * 分析统计 API 路由
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getTimeAggregation } from '../services/analyticsService';
import { getTagEventDetails } from '../services/tagService';

export async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  // 获取时间聚合数据
  fastify.get(
    '/api/analytics/time-aggregation',
    async (
      request: FastifyRequest<{
        Querystring: { granularity?: 'week' | 'month' | 'year' };
      }>,
      reply: FastifyReply
    ) => {
      const { granularity = 'month' } = request.query;
      try {
        const data = await getTimeAggregation(granularity);
        reply.send({ success: true, data });
      } catch (_error) {
        reply.code(500).send({
          success: false,
          error: { code: 'ANALYTICS_FAILED', message: '获取聚合数据失败' },
        });
      }
    }
  );

  // 获取指定标签下的事件聚合详情
  fastify.get(
    '/api/analytics/tag-aggregation/:tagId',
    async (
      request: FastifyRequest<{
        Params: { tagId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { tagId } = request.params;
      try {
        const data = await getTagEventDetails(tagId);
        reply.send({ success: true, data });
      } catch (error) {
        if (error instanceof Error && error.message === '标签不存在') {
          reply.code(404).send({
            success: false,
            error: { code: 'NOT_FOUND', message: '标签不存在' },
          });
        } else {
          reply.code(500).send({
            success: false,
            error: { code: 'ANALYTICS_FAILED', message: '获取标签聚合数据失败' },
          });
        }
      }
    }
  );
}
