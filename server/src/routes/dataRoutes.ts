import { FastifyInstance } from 'fastify';
import { join } from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import env from '../config/env';

export async function dataRoutes(fastify: FastifyInstance) {
  fastify.get('/api/data', async (request, reply) => {
    try {
      const csvPath = join(env.DATA_PATH, 'releases.csv');
      
      // 파일이 존재하는지 확인
      if (!fs.existsSync(csvPath)) {
        return [];
      }

      const csvData = await fs.promises.readFile(csvPath, 'utf-8');
      const releases = parse(csvData, { columns: true });
      return releases;
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: '데이터를 불러오는데 실패했습니다.' });
    }
  });
}

export default dataRoutes; 