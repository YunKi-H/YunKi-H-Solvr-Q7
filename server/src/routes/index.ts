import { FastifyInstance } from 'fastify'
import dataRoutes from './dataRoutes'

// 모든 라우트 등록
export const createRoutes = () => async (fastify: FastifyInstance) => {
  // 데이터 라우트
  fastify.register(dataRoutes)
}
