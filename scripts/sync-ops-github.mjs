import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const projectsPath = path.join(repoRoot, 'data', 'ops', 'projects.json');
const outputPath = path.join(repoRoot, 'data', 'ops', 'github-cache.json');

const fallback = {
  generatedAt: new Date(0).toISOString(),
  mode: 'fallback',
  account: 'unknown',
  repoSnapshots: [],
  releases: [],
  projectBoards: [],
  warnings: ['GitHub sync has not been run yet. Run `npm run ops:sync-github` with gh auth or a GITHUB_TOKEN to hydrate live repo/project/release data.'],
};

main().catch(async (error) => {
  console.warn('[ops:sync-github] using fallback cache:', error.message);
  const previous = await readJsonSafe(outputPath, fallback);
  await fs.writeFile(outputPath, JSON.stringify({ ...previous, mode: 'fallback', warnings: [...new Set([...(previous.warnings || []), error.message])]}, null, 2) + '\n');
  process.exitCode = 0;
});

async function main() {
  const projects = await readJsonSafe(projectsPath, []);
  const repos = [...new Set(projects.map((project) => project.repo).filter(Boolean))];
  if (!repos.length) {
    throw new Error('No repos declared in data/ops/projects.json');
  }

  const account = (await detectAccount()) || 'unknown';
  const repoSnapshots = [];
  const releases = [];
  const warnings = [];

  for (const repo of repos) {
    try {
      const snapshot = await fetchRepoSnapshot(repo);
      repoSnapshots.push(snapshot);
      releases.push(...(await fetchRepoReleases(repo)));
    } catch (error) {
      warnings.push(`${repo}: ${error.message}`);
    }
  }

  const projectBoards = [];
  for (const owner of [...new Set(repoSnapshots.map((repo) => repo.owner))]) {
    try {
      projectBoards.push(...(await fetchProjectBoards(owner, owner.toLowerCase() === account.toLowerCase() ? 'user' : 'organization')));
    } catch (error) {
      warnings.push(`projects(${owner}): ${error.message}`);
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    mode: 'live',
    account,
    repoSnapshots,
    releases: releases.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || ''))).slice(0, 12),
    projectBoards: projectBoards.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))),
    warnings,
  };

  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(`[ops:sync-github] synced ${repoSnapshots.length} repos, ${payload.releases.length} releases, ${projectBoards.length} project boards`);
}

async function fetchRepoSnapshot(repo) {
  const data = await ghJson(['api', `repos/${repo}`]);
  const [owner, name] = repo.split('/');
  const [issueCount, prCount] = await Promise.all([
    searchCount(`repo:${repo} is:issue state:open`),
    searchCount(`repo:${repo} is:pr state:open`),
  ]);

  return {
    repo,
    name,
    owner,
    url: data.html_url,
    description: data.description || '',
    visibility: data.private ? 'private' : (data.visibility || 'public'),
    defaultBranch: data.default_branch,
    pushedAt: data.pushed_at,
    updatedAt: data.updated_at,
    stargazerCount: data.stargazers_count,
    forkCount: data.forks_count,
    openIssuesCount: issueCount,
    openPullRequestsCount: prCount,
    watchersCount: data.subscribers_count ?? data.watchers_count,
    primaryLanguage: data.language || undefined,
    topics: data.topics || [],
    hasProjectsEnabled: data.has_projects,
    isArchived: data.archived,
  };
}

async function fetchRepoReleases(repo) {
  const rows = await ghJson(['api', `repos/${repo}/releases?per_page=4`]);
  return rows.map((release) => ({
    id: String(release.id),
    repo,
    name: release.name || release.tag_name,
    tagName: release.tag_name,
    url: release.html_url,
    publishedAt: release.published_at,
    isDraft: Boolean(release.draft),
    isPrerelease: Boolean(release.prerelease),
    description: release.body ? String(release.body).split('\n').filter(Boolean).slice(0, 3).join(' ') : '',
  }));
}

async function fetchProjectBoards(login, ownerType) {
  const ownerField = ownerType === 'user' ? 'user' : 'organization';
  const query = `query($login:String!) {\n  ${ownerField}(login:$login) {\n    projectsV2(first:10, orderBy:{field:UPDATED_AT, direction:DESC}) {\n      nodes {\n        id\n        title\n        number\n        url\n        updatedAt\n        closed\n        items(first:1) { totalCount }\n        fields(first:20) {\n          nodes {\n            ... on ProjectV2FieldCommon {\n              name\n            }\n          }\n        }\n      }\n    }\n  }\n}`;
  const data = await ghJson(['api', 'graphql', '-f', `query=${query}`, '-F', `login=${login}`]);
  const nodes = data?.data?.[ownerField]?.projectsV2?.nodes || [];
  return nodes.map((node) => ({
    id: node.id,
    owner: login,
    ownerType,
    title: node.title,
    number: node.number,
    url: node.url,
    updatedAt: node.updatedAt,
    closed: Boolean(node.closed),
    itemCount: node.items?.totalCount,
    fieldNames: (node.fields?.nodes || []).map((field) => field?.name).filter(Boolean),
  }));
}

async function searchCount(query) {
  const encoded = encodeURIComponent(query);
  const result = await ghJson(['api', `search/issues?q=${encoded}&per_page=1`]);
  return result.total_count ?? 0;
}

async function detectAccount() {
  try {
    const login = await ghText(['api', 'user', '-q', '.login']);
    return login.trim();
  } catch {
    return undefined;
  }
}

async function ghJson(args) {
  const stdout = await ghText(args);
  return JSON.parse(stdout);
}

async function ghText(args) {
  const env = { ...process.env };
  const { stdout } = await execFileAsync('gh', args, { cwd: repoRoot, env, maxBuffer: 8 * 1024 * 1024 });
  return stdout;
}

async function readJsonSafe(filePath, fallbackValue) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallbackValue;
  }
}
