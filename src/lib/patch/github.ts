import "server-only";
import { Octokit } from "@octokit/rest";

export type RepoFile = {
  path: string;
  sha: string;
  text: string;
};

export type PullRequestFile = {
  path: string;
  sha?: string;
  content: string;
  message: string;
};

export type GitSource = {
  defaultBranch(): Promise<string>;
  readFile(path: string, ref: string): Promise<RepoFile | null>;
  listCodePaths(ref: string): Promise<string[]>;
  commitPullRequest(input: {
    baseBranch: string;
    branch: string;
    title: string;
    body: string;
    files: PullRequestFile[];
  }): Promise<{ url: string; number: number }>;
};

const CODE_PATH = /\.(tsx|ts|jsx|js|mjs|cjs)$/;
const SKIPPED_PATH = /(^|\/)(node_modules|dist|build|\.next|coverage)\//;

export function createGitHubSource(token: string, owner: string, repo: string): GitSource {
  const octokit = new Octokit({ auth: token });
  return {
    async defaultBranch() {
      const { data } = await octokit.repos.get({ owner, repo });
      return data.default_branch;
    },
    async readFile(path, ref) {
      const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
      if (!isGithubFile(data)) {
        return null;
      }
      return {
        path,
        sha: data.sha,
        text: Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8"),
      };
    },
    async listCodePaths(ref) {
      const { data: reference } = await octokit.git.getRef({ owner, repo, ref: `heads/${ref}` });
      const { data: commit } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: reference.object.sha,
      });
      const { data: tree } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: commit.tree.sha,
        recursive: "1",
      });
      return (tree.tree ?? [])
        .flatMap((item) => {
          if (item.type !== "blob" || !item.path || !CODE_PATH.test(item.path) || SKIPPED_PATH.test(item.path)) {
            return [];
          }
          return [item.path];
        })
        .slice(0, 400);
    },
    async commitPullRequest(input) {
      const { data: base } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${input.baseBranch}`,
      });
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${input.branch}`,
        sha: base.object.sha,
      });
      for (const file of input.files) {
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: file.path,
          message: file.message,
          content: Buffer.from(file.content, "utf8").toString("base64"),
          sha: file.sha,
          branch: input.branch,
        });
      }
      const { data: pull } = await octokit.pulls.create({
        owner,
        repo,
        title: input.title,
        head: input.branch,
        base: input.baseBranch,
        body: input.body,
      });
      return { url: pull.html_url, number: pull.number };
    },
  };
}

function isGithubFile(data: unknown): data is { type: "file"; sha: string; content: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "file" &&
    "sha" in data &&
    typeof data.sha === "string" &&
    "content" in data &&
    typeof data.content === "string"
  );
}
