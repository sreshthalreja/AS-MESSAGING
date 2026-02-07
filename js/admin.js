/*
  Admin Upload
  1) Create a GitHub Personal Access Token (classic or fine-grained) with repo contents write access.
  2) Configure REPO_OWNER, REPO_NAME, and REPO_BRANCH below.
  3) Open /admin.html, paste your token, fill the form, and submit.
  4) The image is saved to /uploads/ and /data/messages.json is updated.

  Token is kept in memory only and never stored in localStorage.
*/

const REPO_OWNER = "sreshthalreja";
const REPO_NAME = "AS-MESSAGING";
const REPO_BRANCH = "main";

const adminForm = document.getElementById("adminForm");
const adminStatus = document.getElementById("adminStatus");

function setStatus(text, isError = false) {
  adminStatus.textContent = text;
  adminStatus.style.color = isError ? "#b04646" : "#3a2b2f";
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function sanitizeFilename(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

async function githubRequest(path, token, options = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${token}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 404) return { notFound: true };
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "GitHub API error");
  }
  return res.json();
}

async function getFile(token, filePath) {
  return githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}?ref=${REPO_BRANCH}`,
    token,
    { method: "GET" }
  );
}

async function putFile(token, filePath, contentBase64, message, sha = undefined) {
  return githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: contentBase64,
        branch: REPO_BRANCH,
        sha,
      }),
    }
  );
}

function decodeBase64(content) {
  try {
    return atob(content);
  } catch (err) {
    return "";
  }
}

async function loadMessagesFromRepo(token) {
  const file = await getFile(token, "data/messages.json");
  if (file.notFound) return { messages: [], sha: undefined };

  const jsonText = decodeBase64(file.content);
  const messages = jsonText ? JSON.parse(jsonText) : [];
  return { messages, sha: file.sha };
}

adminForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const token = document.getElementById("token").value.trim();
  const title = document.getElementById("title").value.trim();
  const eventName = document.getElementById("eventName").value.trim();
  const message = document.getElementById("message").value.trim();
  const imageFile = document.getElementById("image").files[0];

  if (!token || !title || !message || !imageFile) {
    setStatus("Please fill all required fields.", true);
    return;
  }

  setStatus("Uploading...");

  try {
    const timestamp = new Date().toISOString();
    const safeTitle = sanitizeFilename(title) || "message";
    const imageExt = imageFile.name.split(".").pop() || "jpg";
    const imageName = `${safeTitle}-${Date.now()}.${imageExt}`;
    const imagePath = `uploads/${imageName}`;

    const imageBase64 = await toBase64(imageFile);

    const imageCommitMessage = `Add image ${imageName}`;
    await putFile(token, imagePath, imageBase64, imageCommitMessage);

    const { messages, sha } = await loadMessagesFromRepo(token);

    const newMessage = {
      id: `msg_${Date.now()}`,
      title,
      message,
      imageUrl: imagePath,
      eventName: eventName || "",
      createdAt: timestamp,
    };

    const updatedMessages = [newMessage, ...messages];
    const messagesContent = btoa(JSON.stringify(updatedMessages, null, 2));

    const messageCommit = `Add message ${newMessage.id}`;
    await putFile(token, "data/messages.json", messagesContent, messageCommit, sha);

    adminForm.reset();
    setStatus("Uploaded successfully.");
  } catch (err) {
    console.error(err);
    setStatus("Upload failed. Check token permissions and repo settings.", true);
  }
});
