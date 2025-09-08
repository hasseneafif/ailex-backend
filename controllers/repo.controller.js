// controllers/repoController.js
import { Octokit } from "@octokit/core";
// ------------------- Helper Functions -------------------

// 1️⃣ Extract owner/repo from GitHub URL
function parseRepoUrl(repoUrl) {
  const match = repoUrl.match(/github.com\/([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error("Invalid GitHub repository URL");
  return { owner: match[1], repo: match[2] };
}

// 2️⃣ Get the repo tree recursively via GitHub API
async function fetchRepoTree(octokit, owner, repo, branch = "main") {
  const res = await octokit.request(
    "GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
    { owner, repo, branch }
  );
  return res.data.tree; // array of { path, type, sha }
}

// 3️⃣ Filter files by allowed extensions
function filterFilesByExtensions(files, includeExtensions = []) {
  if (includeExtensions.length === 0) return files.filter(f => f.type === "blob");
  return files.filter(
    f =>
      f.type === "blob" &&
      includeExtensions.includes(f.path.split(".").pop().toLowerCase())
  );
}

// 4️⃣ Fetch file content for each blob
async function fetchFileContents(octokit, owner, repo, files) {
  const promises = files.map(async f => {
    const blobRes = await octokit.request(
      "GET /repos/{owner}/{repo}/git/blobs/{sha}",
      { owner, repo, sha: f.sha }
    );
    const content = Buffer.from(blobRes.data.content, "base64").toString("utf-8");
    return { name: f.path.split("/").pop(), path: f.path, type: "file", content };
  });

  return Promise.all(promises);
}

// 5️⃣ Build nested JSON tree from flat list
function buildNestedTree(files) {
  const root = [];
  files.forEach(f => {
    const parts = f.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current.push({ ...f });
      } else {
        let folder = current.find(c => c.name === part && c.type === "directory");
        if (!folder) {
          folder = { name: part, type: "directory", children: [] };
          current.push(folder);
        }
        current = folder.children;
      }
    }
  });
  return root;
}

// ------------------- Main Controller Function -------------------

/**
 * Fetches files from a GitHub repo, filtered by extensions, and returns nested JSON
 * @param repoUrl GitHub repository URL
 * @param includeExtensions Array of file extensions to include (optional)
 * @param githubToken Personal Access Token for authentication (required for private repos)
 */
export async function getRepoFiles(repoUrl, includeExtensions = [], githubToken) {
  const { owner, repo } = parseRepoUrl(repoUrl);

  const octokit = new Octokit({ auth: githubToken });

  // 1️⃣ Get repo tree
  const tree = await fetchRepoTree(octokit, owner, repo);

  // 2️⃣ Filter by extensions
  const filteredFiles = filterFilesByExtensions(tree, includeExtensions);

  // 3️⃣ Fetch file contents
  const filesWithContent = await fetchFileContents(octokit, owner, repo, filteredFiles);

  // 4️⃣ Build nested JSON tree
  const nestedTree = buildNestedTree(filesWithContent);

  return nestedTree;
}



export function meta(req, res) {
  const payload = { app: 'analyze' };
  const secret = process.env.SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'SECRET not set in environment.' });
  }
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  res.json({ token });
}


