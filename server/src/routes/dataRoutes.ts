import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const dataRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/api/data', async (request, reply) => {
    try {
      const csvPath = path.join(__dirname, '../scripts/release-stats.csv');
      console.log('CSV 파일 경로:', csvPath);
      
      const fileContent = fs.readFileSync(csvPath, 'utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      });

      // 한글 -> 영문 필드 매핑
      const keyMap: Record<string, string> = {
        '레포지토리': 'repository',
        '태그': 'tag_name',
        '릴리스명': 'name',
        '생성일': 'created_at',
        '배포일': 'published_at',
        '생성일(ISO)': 'created_at_iso',
        '배포일(ISO)': 'published_at_iso',
        '배포년도': 'published_year',
        '배포월': 'published_month',
        '요일(0-6)': 'weekday',
        '주말여부': 'is_weekend',
        '초안여부': 'is_draft',
        '프리릴리스여부': 'is_prerelease',
        '릴리스노트 길이': 'release_note_length',
        '릴리스노트 존재여부': 'has_release_note',
        '생성일로부터 배포까지 일수': 'days_to_publish',
      };

      // 각 레코드의 키를 영문으로 변환
      const mappedRecords = records.map((record: Record<string, any>) => {
        const mapped: Record<string, any> = {};
        for (const key in record) {
          const engKey = keyMap[key] || key;
          mapped[engKey] = record[key];
        }
        return mapped;
      });

      return mappedRecords;
    } catch (error) {
      console.error('파일 읽기 오류:', error);
      reply.code(500).send({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
    }
  });
};

export default dataRoutes; 