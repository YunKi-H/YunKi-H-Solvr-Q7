import { FastifyInstance } from 'fastify';
import { join } from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import env from '../config/env';

interface QueryParams {
  startDate?: string;
  endDate?: string;
}

export async function dataRoutes(fastify: FastifyInstance) {
  fastify.get('/api/data', async (request, reply) => {
    try {
      const { startDate, endDate } = request.query as QueryParams;
      const csvPath = join(env.DATA_PATH, 'releases.csv');
      
      // 파일이 존재하는지 확인
      if (!fs.existsSync(csvPath)) {
        return [];
      }

      const csvData = await fs.promises.readFile(csvPath, 'utf-8');
      let releases = parse(csvData, { columns: true });

      // 기간 필터링
      if (startDate || endDate) {
        releases = releases.filter((release: any) => {
          const publishedDate = new Date(release.published_at);
          const start = startDate ? new Date(startDate) : new Date(0);
          const end = endDate ? new Date(endDate) : new Date();
          return publishedDate >= start && publishedDate <= end;
        });
      }

      return releases;
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: '데이터를 불러오는데 실패했습니다.' });
    }
  });
}

export default dataRoutes; 