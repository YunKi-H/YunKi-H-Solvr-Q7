import { FastifyInstance } from 'fastify';
import { join } from 'path';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import env from '../config/env';

interface QueryParams {
  startDate?: string;
  endDate?: string;
  repository?: string;
}

interface ReleaseData {
  repository: string;
  tag_name: string;
  name: string;
  created_at: string;
  published_at: string;
  published_year: string;
  published_month: string;
  published_day: string;
  weekday: string;
  is_weekend: string;
  is_draft: string;
  is_prerelease: string;
  release_note_length: string;
  has_release_note: string;
  days_to_publish: string;
}

interface DashboardData {
  monthlyData: Array<{
    month: string;
    [key: string]: string | number;
  }>;
  weekdayData: Array<{
    name: string;
    value: number;
  }>;
  releaseTypeData: Array<{
    name: string;
    value: number;
  }>;
  statistics: {
    totalReleases: number;
    preReleases: number;
    averageReleaseInterval: number;
  };
  repositories: string[];
}

export async function dataRoutes(fastify: FastifyInstance) {
  fastify.get('/api/data', async (request, reply) => {
    try {
      const { startDate, endDate, repository } = request.query as QueryParams;
      const csvPath = join(env.DATA_PATH, 'releases.csv');
      
      if (!fs.existsSync(csvPath)) {
        return {
          monthlyData: [],
          weekdayData: [],
          releaseTypeData: [],
          statistics: {
            totalReleases: 0,
            preReleases: 0,
            averageReleaseInterval: 0
          },
          repositories: []
        };
      }

      const csvData = await fs.promises.readFile(csvPath, 'utf-8');
      let releases = parse(csvData, { columns: true }) as ReleaseData[];

      // 기간 필터링
      if (startDate || endDate) {
        releases = releases.filter((release) => {
          const publishedDate = new Date(release.published_at);
          const start = startDate ? new Date(startDate) : new Date(0);
          const end = endDate ? new Date(endDate) : new Date();
          return publishedDate >= start && publishedDate <= end;
        });
      }

      // 레포지토리 필터링
      if (repository && repository !== 'all') {
        releases = releases.filter(release => release.repository === repository);
      }

      // 레포지토리 목록
      const repositories = Array.from(new Set(releases.map(item => item.repository)));

      // 월별 데이터 처리
      const monthlyData = processMonthlyData(releases, repositories);

      // 요일별 데이터 처리
      const weekdayData = processWeekdayData(releases);

      // 릴리스 타입 데이터 처리
      const releaseTypeData = processReleaseTypeData(releases);

      // 통계 데이터 처리
      const statistics = processStatistics(releases);

      const dashboardData: DashboardData = {
        monthlyData,
        weekdayData,
        releaseTypeData,
        statistics,
        repositories
      };

      return dashboardData;
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: '데이터를 불러오는데 실패했습니다.' });
    }
  });
}

function processMonthlyData(releases: ReleaseData[], repositories: string[]) {
  const monthlyData: { [key: string]: { [key: string]: number } } = {};

  releases.forEach(release => {
    const date = new Date(release.published_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const repo = release.repository;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {};
    }
    monthlyData[monthKey][repo] = (monthlyData[monthKey][repo] || 0) + 1;
  });

  return Object.entries(monthlyData)
    .map(([month, data]) => {
      const row: { month: string; [key: string]: string | number } = { month };
      repositories.forEach(repo => {
        row[repo] = data[repo] || 0;
      });
      return row;
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

function processWeekdayData(releases: ReleaseData[]) {
  const weekdayCounts: { [key: string]: number } = {};
  const weekdayNames = ['일', '월', '화', '수', '목', '금', '토'];

  releases.forEach(release => {
    const weekday = release.weekday;
    weekdayCounts[weekday] = (weekdayCounts[weekday] || 0) + 1;
  });

  return Object.entries(weekdayCounts).map(([weekday, count]) => ({
    name: weekdayNames[parseInt(weekday, 10)],
    value: count
  }));
}

function processReleaseTypeData(releases: ReleaseData[]) {
  const regularReleases = releases.filter(
    item => item.is_prerelease === 'false' && item.is_draft === 'false'
  ).length;
  const preReleases = releases.filter(item => item.is_prerelease === 'true').length;
  const drafts = releases.filter(item => item.is_draft === 'true').length;

  return [
    { name: '일반 릴리스', value: regularReleases },
    { name: '프리릴리스', value: preReleases },
    { name: '초안', value: drafts }
  ];
}

function processStatistics(releases: ReleaseData[]) {
  const sortedDates = releases
    .map(item => new Date(item.published_at))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const averageReleaseInterval = sortedDates.length > 1
    ? Math.round(
        (sortedDates[sortedDates.length - 1].getTime() - sortedDates[0].getTime()) /
        (1000 * 60 * 60 * 24 * (sortedDates.length - 1))
      )
    : 0;

  return {
    totalReleases: releases.length,
    preReleases: releases.filter(item => item.is_prerelease === 'true').length,
    averageReleaseInterval
  };
}

export default dataRoutes; 