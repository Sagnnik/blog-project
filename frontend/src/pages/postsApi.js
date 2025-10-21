import { authFetch } from "./authFetch";

export async function fetchPosts({ getToken, backendUrl, limit=50, skip=0, showDeleted=false }) {
    const url = `${backendUrl}/api/posts?limit=${limit}&skip=${skip}${showDeleted ? "&show_deleted=1" : ""}`;
    return authFetch(getToken, url);
}

export async function fetchPostById({ getToken, backendUrl, id }) {
    const url = `${backendUrl}/api/posts/${encodeURIComponent(id)}`;
    return authFetch(getToken, url);
}

export async function createPost({ getToken, backendUrl }) {
    const url = `${backendUrl}/api/posts`;
    return authFetch(getToken, url, {mehtod: "POST"});
}

export async function patchStatus({ getToken, backendUrl, id, status }) {
    const url = `${backendUrl}/api/posts/${id}/status?status=${encodeURIComponent(status)}`;
    return authFetch(getToken, url, {method: "PATCH"});
}

export async function softDeletePost({ getToken, backendUrl, id }) {
    const url = `${backendUrl}/api/posts/${id}/delete`;
    return authFetch(getToken, url, {method:"PATCH"});
}

export async function restorePost({ getToken, backendUrl, id }) {
  const url = `${backendUrl}/api/posts/${id}/restore`;
  return authFetch(getToken, url, { method: "PATCH" });
}

export async function permanentDeletePost({ getToken, backendUrl, id }) {
    const url = `${backendUrl}/api/posts/${id}/delete`;
    return authFetch(getToken, url, {method:"DELETE"});
}