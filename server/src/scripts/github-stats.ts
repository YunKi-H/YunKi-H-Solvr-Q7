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

async function getReleases(owner: string, repo: string): Promise<Release[]> {
  try {
    const releases = await octokit.repos.listReleases({
      owner,
      repo,
    });
    return releases.data;
  } catch (error) {
    console.error(`${owner}/${repo}의 릴리스 데이터를 가져오는 중 오류 발생:`, error);
    return [];
  }
}

async function generateReleaseStats(repos: RepoConfig[]) {
  try {
    const allRecords = [];
    
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
    }
    
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