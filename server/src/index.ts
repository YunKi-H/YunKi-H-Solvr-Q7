import Fastify from 'fastify'
import cors from '@fastify/cors'
import env from './config/env'
import { createRoutes } from './routes'

// Fastify 인스턴스 생성
const fastify = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
})

// 서버 시작 함수
async function start() {
  try {
    // CORS 설정
    await fastify.register(cors, {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true
    })

    // 라우트 등록
    await fastify.register(createRoutes())

    // 서버 시작
    await fastify.listen({ port: env.PORT, host: env.HOST })

    console.log(`서버가 http://${env.HOST}:${env.PORT} 에서 실행 중입니다.`)
  } catch (error) {
    fastify.log.error(error)
    process.exit(1)
  }
}

// 서버 시작
start()
