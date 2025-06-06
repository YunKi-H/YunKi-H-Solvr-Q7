import { Octokit } from '@octokit/rest';
import { createObjectCsvWriter } from 'csv-writer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

interface Release {
  tag_name: string;
  name: string | null;
  created_at: string;
  published_at: string | null;
  body?: string | null;
  draft: boolean;
  prerelease: boolean;
}

interface RepoConfig {
  owner: string;
  repo: string;
}

interface ReleaseStats {
  total_releases: number;
  first_release_date: string;
  latest_release_date: string;
  prerelease_count: number;
  draft_count: number;
  releases_per_year: number;
  releases_per_week: number;
  releases_per_day: number;
  total_releases_this_year: number;
  total_releases_this_week: number;
  total_releases_today: number;
  total_releases_last_year: number;
  total_releases_last_6months: number;
  total_releases_last_3months: number;
  total_releases_last_month: number;
}

async function getReleases(owner: string, repo: string): Promise<Release[]> {
  try {
    const allReleases: Release[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const releases = await octokit.repos.listReleases({
        owner,
        repo,
        per_page: 100,
        page,
      });

      if (releases.data.length === 0) {
        hasMore = false;
      } else {
        allReleases.push(...releases.data);
        page++;
      }
    }

    return allReleases;
  } catch (error) {
    console.error(`${owner}/${repo}의 릴리스 데이터를 가져오는 중 오류 발생:`, error);
    return [];
  }
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0: 일요일, 6: 토요일
}

function calculateTimeBasedStats(releaseDates: Date[]): { 
  perYear: number; 
  perWeek: number; 
  perDay: number;
  thisYear: number;
  thisWeek: number;
  today: number;
  lastYear: number;
  last6Months: number;
  last3Months: number;
  lastMonth: number;
} {
  if (releaseDates.length === 0) return { 
    perYear: 0, 
    perWeek: 0, 
    perDay: 0,
    thisYear: 0,
    thisWeek: 0,
    today: 0,
    lastYear: 0,
    last6Months: 0,
    last3Months: 0,
    lastMonth: 0
  };

  // 평일 릴리스만 필터링
  const weekdayReleases = releaseDates.filter(date => isWeekday(date));
  const sortedDates = weekdayReleases.sort((a, b) => a.getTime() - b.getTime());
  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];
  
  const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  const yearsDiff = daysDiff / 365;
  const weeksDiff = daysDiff / 7;

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  
  // 이전 기간의 시작일 계산
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);

  // 평일 수 계산 (주말 제외)
  const weekdayDays = Math.ceil(daysDiff * 5 / 7);
  const weekdayWeeks = weekdayDays / 5;
  const weekdayYears = weekdayDays / 260; // 연간 평일 수 약 260일 기준

  return {
    perYear: Math.round((weekdayReleases.length / weekdayYears) * 100) / 100,
    perWeek: Math.round((weekdayReleases.length / weekdayWeeks) * 100) / 100,
    perDay: Math.round((weekdayReleases.length / weekdayDays) * 100) / 100,
    thisYear: weekdayReleases.filter(date => date >= startOfYear).length,
    thisWeek: weekdayReleases.filter(date => date >= startOfWeek).length,
    today: weekdayReleases.filter(date => date >= startOfDay).length,
    lastYear: weekdayReleases.filter(date => date >= oneYearAgo && date < startOfYear).length,
    last6Months: weekdayReleases.filter(date => date >= sixMonthsAgo && date < threeMonthsAgo).length,
    last3Months: weekdayReleases.filter(date => date >= threeMonthsAgo && date < oneMonthAgo).length,
    lastMonth: weekdayReleases.filter(date => date >= oneMonthAgo && date < startOfDay).length
  };
}

async function generateReleaseStats(repos: RepoConfig[]) {
  try {
    const allRecords = [];
    const statsByRepo: Record<string, ReleaseStats> = {};
    
    for (const { owner, repo } of repos) {
      const releases = await getReleases(owner, repo);
      
      const records = releases.map(release => {
        const publishedDate = release.published_at ? new Date(release.published_at) : null;
        const createdDate = new Date(release.created_at);
        
        return {
          repository: `${owner}/${repo}`,
          tag_name: release.tag_name,
          name: release.name || '',
          created_at: createdDate.toLocaleDateString(),
          published_at: publishedDate ? publishedDate.toLocaleDateString() : '',
          created_at_iso: createdDate.toISOString(),
          published_at_iso: publishedDate ? publishedDate.toISOString() : '',
          year: publishedDate ? publishedDate.getFullYear() : null,
          month: publishedDate ? publishedDate.getMonth() + 1 : null,
          day: publishedDate ? publishedDate.getDate() : null,
          day_of_week: publishedDate ? publishedDate.getDay() : null,
          is_weekend: publishedDate ? (publishedDate.getDay() === 0 || publishedDate.getDay() === 6) : null,
          draft: release.draft,
          prerelease: release.prerelease,
          body_length: release.body ? release.body.length : 0,
          has_body: release.body ? true : false,
          days_since_creation: publishedDate ? Math.floor((publishedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) : null
        };
      });
      
      allRecords.push(...records);

      // 통계 계산
      const prereleaseCount = records.filter(record => record.prerelease).length;
      const draftCount = records.filter(record => record.draft).length;
      
      const releaseDates = records
        .filter(record => record.published_at)
        .map(record => new Date(record.published_at));

      const timeStats = calculateTimeBasedStats(releaseDates);
      
      statsByRepo[`${owner}/${repo}`] = {
        total_releases: records.length,
        first_release_date: releaseDates.length > 0 ? new Date(Math.min(...releaseDates.map(d => d.getTime()))).toLocaleDateString() : 'N/A',
        latest_release_date: releaseDates.length > 0 ? new Date(Math.max(...releaseDates.map(d => d.getTime()))).toLocaleDateString() : 'N/A',
        prerelease_count: prereleaseCount,
        draft_count: draftCount,
        releases_per_year: timeStats.perYear,
        releases_per_week: timeStats.perWeek,
        releases_per_day: timeStats.perDay,
        total_releases_this_year: timeStats.thisYear,
        total_releases_this_week: timeStats.thisWeek,
        total_releases_today: timeStats.today,
        total_releases_last_year: timeStats.lastYear,
        total_releases_last_6months: timeStats.last6Months,
        total_releases_last_3months: timeStats.last3Months,
        total_releases_last_month: timeStats.lastMonth,
      };
    }
    
    // 상세 데이터 CSV
    const csvWriter = createObjectCsvWriter({
      path: path.join(__dirname, 'release-stats.csv'),
      header: [
        { id: 'repository', title: '레포지토리' },
        { id: 'tag_name', title: '태그' },
        { id: 'name', title: '릴리스명' },
        { id: 'created_at', title: '생성일' },
        { id: 'published_at', title: '배포일' },
        { id: 'created_at_iso', title: '생성일(ISO)' },
        { id: 'published_at_iso', title: '배포일(ISO)' },
        { id: 'year', title: '배포년도' },
        { id: 'month', title: '배포월' },
        { id: 'day', title: '배포일' },
        { id: 'day_of_week', title: '요일(0-6)' },
        { id: 'is_weekend', title: '주말여부' },
        { id: 'draft', title: '초안여부' },
        { id: 'prerelease', title: '프리릴리스여부' },
        { id: 'body_length', title: '릴리스노트 길이' },
        { id: 'has_body', title: '릴리스노트 존재여부' },
        { id: 'days_since_creation', title: '생성일로부터 배포까지 일수' }
      ],
    });

    await csvWriter.writeRecords(allRecords);

    // 통계 정보 CSV
    const statsWriter = createObjectCsvWriter({
      path: path.join(__dirname, 'release-summary.csv'),
      header: [
        { id: 'repository', title: '레포지토리' },
        { id: 'total_releases', title: '총 릴리스 수' },
        { id: 'first_release_date', title: '첫 릴리스 날짜' },
        { id: 'latest_release_date', title: '최신 릴리스 날짜' },
        { id: 'prerelease_count', title: '프리릴리스 수' },
        { id: 'draft_count', title: '초안 수' },
        { id: 'releases_per_year', title: '연간 평균 릴리스 수' },
        { id: 'releases_per_week', title: '주간 평균 릴리스 수' },
        { id: 'releases_per_day', title: '일간 평균 릴리스 수' },
        { id: 'total_releases_this_year', title: '올해 총 릴리스 수' },
        { id: 'total_releases_this_week', title: '이번 주 총 릴리스 수' },
        { id: 'total_releases_today', title: '오늘 총 릴리스 수' },
        { id: 'total_releases_last_year', title: '작년 총 릴리스 수' },
        { id: 'total_releases_last_6months', title: '지난 6개월 총 릴리스 수' },
        { id: 'total_releases_last_3months', title: '지난 3개월 총 릴리스 수' },
        { id: 'total_releases_last_month', title: '지난 1개월 총 릴리스 수' }
      ],
    });

    const statsRecords = Object.entries(statsByRepo).map(([repo, stats]) => ({
      repository: repo,
      ...stats,
    }));

    await statsWriter.writeRecords(statsRecords);
  } catch (error) {
    console.error('에러 발생:', error);
  }
}

// 실행할 레포지토리 목록
const repos: RepoConfig[] = [
  { owner: 'daangn', repo: 'stackflow' },
  { owner: 'daangn', repo: 'seed-design' },
  // 필요한 레포지토리를 여기에 추가하세요
];

if (repos.length === 0) {
  console.error('레포지토리 목록이 비어있습니다.');
  process.exit(1);
}

generateReleaseStats(repos); 