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
  assets: {
    name: string;
    download_count: number;
  }[];
}

interface RepoConfig {
  owner: string;
  repo: string;
}

interface ReleaseStats {
  total_releases: number;
  total_downloads: number;
  avg_downloads_per_release: number;
  total_assets: number;
  avg_assets_per_release: number;
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

  const sortedDates = releaseDates.sort((a, b) => a.getTime() - b.getTime());
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

  return {
    perYear: Math.round((releaseDates.length / yearsDiff) * 100) / 100,
    perWeek: Math.round((releaseDates.length / weeksDiff) * 100) / 100,
    perDay: Math.round((releaseDates.length / daysDiff) * 100) / 100,
    thisYear: releaseDates.filter(date => date >= startOfYear).length,
    thisWeek: releaseDates.filter(date => date >= startOfWeek).length,
    today: releaseDates.filter(date => date >= startOfDay).length,
    lastYear: releaseDates.filter(date => date >= oneYearAgo && date < startOfYear).length,
    last6Months: releaseDates.filter(date => date >= sixMonthsAgo && date < threeMonthsAgo).length,
    last3Months: releaseDates.filter(date => date >= threeMonthsAgo && date < oneMonthAgo).length,
    lastMonth: releaseDates.filter(date => date >= oneMonthAgo && date < startOfDay).length
  };
}

async function generateReleaseStats(repos: RepoConfig[]) {
  try {
    const allRecords = [];
    const statsByRepo: Record<string, ReleaseStats> = {};
    
    for (const { owner, repo } of repos) {
      console.log(`${owner}/${repo}의 릴리스 데이터를 수집 중...`);
      const releases = await getReleases(owner, repo);
      
      const records = releases.map(release => ({
        repository: `${owner}/${repo}`,
        tag_name: release.tag_name,
        name: release.name || '',
        created_at: new Date(release.created_at).toLocaleDateString(),
        published_at: release.published_at ? new Date(release.published_at).toLocaleDateString() : '',
        draft: release.draft,
        prerelease: release.prerelease,
        total_downloads: release.assets.reduce((sum, asset) => sum + asset.download_count, 0),
        asset_count: release.assets.length,
      }));
      
      allRecords.push(...records);

      // 통계 계산
      const totalDownloads = records.reduce((sum, record) => sum + record.total_downloads, 0);
      const totalAssets = records.reduce((sum, record) => sum + record.asset_count, 0);
      const prereleaseCount = records.filter(record => record.prerelease).length;
      const draftCount = records.filter(record => record.draft).length;
      
      const releaseDates = records
        .filter(record => record.published_at)
        .map(record => new Date(record.published_at));

      const timeStats = calculateTimeBasedStats(releaseDates);
      
      statsByRepo[`${owner}/${repo}`] = {
        total_releases: records.length,
        total_downloads: totalDownloads,
        avg_downloads_per_release: Math.round(totalDownloads / records.length),
        total_assets: totalAssets,
        avg_assets_per_release: Math.round(totalAssets / records.length),
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
        { id: 'draft', title: '초안여부' },
        { id: 'prerelease', title: '프리릴리스여부' },
        { id: 'total_downloads', title: '총 다운로드수' },
        { id: 'asset_count', title: '에셋 수' },
      ],
    });

    await csvWriter.writeRecords(allRecords);
    console.log('CSV 파일이 성공적으로 생성되었습니다.');

    // 통계 정보 CSV
    const statsWriter = createObjectCsvWriter({
      path: path.join(__dirname, 'release-summary.csv'),
      header: [
        { id: 'repository', title: '레포지토리' },
        { id: 'total_releases', title: '총 릴리스 수' },
        { id: 'total_downloads', title: '총 다운로드 수' },
        { id: 'avg_downloads_per_release', title: '릴리스당 평균 다운로드 수' },
        { id: 'total_assets', title: '총 에셋 수' },
        { id: 'avg_assets_per_release', title: '릴리스당 평균 에셋 수' },
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
        { id: 'total_releases_last_month', title: '지난 1개월 총 릴리스 수' },
      ],
    });

    const statsRecords = Object.entries(statsByRepo).map(([repo, stats]) => ({
      repository: repo,
      ...stats,
    }));

    await statsWriter.writeRecords(statsRecords);
    console.log('통계 요약 CSV 파일이 성공적으로 생성되었습니다.');
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