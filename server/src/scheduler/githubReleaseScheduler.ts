import { Octokit } from "@octokit/rest";
import { writeFileSync } from 'fs';
import { join } from 'path';

interface ReleaseData {
  repository: string;
  tag_name: string;
  name: string;
  created_at: string;
  published_at: string;
  created_at_iso: string;
  published_at_iso: string;
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

export class GitHubReleaseScheduler {
  private octokit: Octokit;
  private repositories: string[];
  private dataPath: string;

  constructor(token: string, repositories: string[], dataPath: string) {
    this.octokit = new Octokit({ auth: token });
    this.repositories = repositories;
    this.dataPath = dataPath;
  }

  public startScheduler(intervalMinutes: number): void {
    // 초기 실행
    this.updateCSV();

    // 주기적 실행 설정
    setInterval(() => {
      this.updateCSV();
    }, intervalMinutes * 60 * 1000);
  }

  private async updateCSV(): Promise<void> {
    try {
      const allReleases: ReleaseData[] = [];

      for (const repo of this.repositories) {
        const [owner, repoName] = repo.split('/');
        const releases = await this.fetchReleases(owner, repoName);
        allReleases.push(...releases);
      }

      // CSV 헤더 생성
      const headers = Object.keys(allReleases[0] || {}).join(',');
      // CSV 데이터 생성
      const rows = allReleases.map(release => 
        Object.values(release).map(value => `"${value}"`).join(',')
      );
      // CSV 파일 작성
      const csv = [headers, ...rows].join('\n');
      writeFileSync(join(this.dataPath, 'releases.csv'), csv);
      console.log('CSV file updated successfully');
    } catch (error) {
      console.error('Error updating CSV:', error);
    }
  }

  private async fetchReleases(owner: string, repo: string): Promise<ReleaseData[]> {
    try {
      let allReleases: ReleaseData[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const releases = await this.octokit.repos.listReleases({
          owner,
          repo,
          per_page: 100,
          page
        });

        if (releases.data.length === 0) {
          hasMore = false;
          continue;
        }

        const releaseData = releases.data.map(release => {
          const createdDate = new Date(release.created_at || '');
          const publishedDate = new Date(release.published_at || '');
          const weekday = publishedDate.getDay();
          
          return {
            repository: `${owner}/${repo}`,
            tag_name: release.tag_name,
            name: release.name || '',
            created_at: release.created_at || '',
            published_at: release.published_at || '',
            created_at_iso: release.created_at || '',
            published_at_iso: release.published_at || '',
            published_year: publishedDate.getFullYear().toString(),
            published_month: (publishedDate.getMonth() + 1).toString().padStart(2, '0'),
            published_day: publishedDate.getDate().toString().padStart(2, '0'),
            weekday: weekday.toString(),
            is_weekend: (weekday === 0 || weekday === 6).toString(),
            is_draft: release.draft.toString(),
            is_prerelease: release.prerelease.toString(),
            release_note_length: ((release.body || '').length).toString(),
            has_release_note: ((release.body || '').length > 0).toString(),
            days_to_publish: Math.floor(
              (publishedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
            ).toString(),
          };
        });

        allReleases = allReleases.concat(releaseData);
        page++;

        // GitHub API의 rate limit을 고려하여 약간의 딜레이 추가
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return allReleases;
    } catch (error) {
      console.error(`Error fetching releases for ${owner}/${repo}:`, error);
      return [];
    }
  }
} 