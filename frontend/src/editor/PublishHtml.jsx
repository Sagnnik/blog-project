import React, { useState } from "react";
import SimpleEditor from "./SimpleEditor";
import { slugify, buildFullHtml, parseTags } from './utils';
import { useParams, useNavigate } from "react-router-dom";

export default function PublishHtml () {

    const navigate = useNavigate();
    const {postId} = useParams();
    console.log(postId)

    //const postId = "68e957ae428e36e81dee90c0"
    //const postId = "68e92db1b99e6aa5a6d9247b"
    const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN;
    const BACKEND_BASE_URL = import.meta.env.FASTAPI_BASE_URL;
    
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [tagsText, setTagsText] = useState("");
    const [summary, setSummary] = useState("");

    const [html, setHtml] = useState("");
    const [publish, setPublish] = useState(false);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);

    async function handleCreate() {
        try {
            setCreating(true);

            const payload = {
                title: title.trim(),
                slug: slug.trim() || slugify(title),
                tags: parseTags(tagsText),
                summary: summary.trim(),
                status: "draft",
            }

            const res = await fetch (`http://localhost:8000/api/posts/${postId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${ADMIN_TOKEN}` 
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Create Failed: ${res.status} ${txt}`);
            }
        }
        catch(err) {
            console.error("handleCreat Error:", err);
            alert("Error creating post: " + (err.message || err));
            throw err;
        }
        finally {
            setCreating(false);
        }
    }

    async function handleSave() {
        try {
            setSaving(true)

            const payload = {
                title: title.trim(),
                slug: slug.trim() || slugify(title),
                tags: parseTags(tagsText),
                summary: summary.trim(),
                body: buildFullHtml(html),
                status: "draft"
            }

            const res = await fetch(`http://localhost:8000/api/posts/${postId}`, {
                method:"PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${ADMIN_TOKEN}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Save failed: ${res.status} ${txt}`)
            }

            const data = await res.json()
            console.log("Saved Successfully")
        }
        catch(err) {
            console.error("handleSave Error:", err);
            alert("Error Saving post: " + (err.message || err))
            throw err;
        }
        finally {
            setSaving(false)
        }
        
    }

    async function handlePublish() {
        try {
            setPublish(true)
            const saved = await handleSave();

            const finalHtml = buildFullHtml(title, html, summary);

            const finalSlug = slug.trim() || slugify(title);
            const filename = `${finalSlug.replace(/\s+/g, "-").toLowerCase()}-post.html`
            const blob = new Blob([finalHtml], {type: "text/html"})
            const form = new FormData();
            form.append("file", blob, filename);
            form.append("alt", `HTML snapshot for ${title}`);
            form.append("caption", title);
            form.append("post_id", postId)

            // Upload the final html as asset
            const assetsRes = await fetch ("http://localhost:8000/api/assets/html", {
                method:"POST",
                headers:{
                    "Authorization": `Bearer ${ADMIN_TOKEN}`
                },
                body: form
            })

            if (!assetsRes.ok) {
                const txt = await assetsRes.text();
                throw new Error(`Asset upload failed: ${assetsRes.status} ${txt}`);
            }
            const assetData = await assetsRes.json();

            const assetId = await assetData.id || assetData.asset_id;
            const assetLink = await assetData.link || assetData.public_link;

            const publishPayload = {
                id: postId,
                html_id: assetId,
                html_link: assetLink
            }

            const publishRes = await fetch (`http://localhost:8000/api/posts/${postId}/publish`, {
                method: "PATCH",
                headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ADMIN_TOKEN}`
                },
                body: JSON.stringify(publishPayload),
            });

            if (!publishRes.ok) {
                const txt = await publishRes.text();
                throw new Error(`Publish failed: ${publishRes.status} ${txt}`);
            }
            const publishData = await publishRes.json();
            console.log("Published Successfully")
            const previewUrl = assetLink

            if (previewUrl) {
                window.open(previewUrl, "_blank");
            }
            else {
                alert("Published successfully (no preview URL returned)");
                console.log("Publish response:", publishData);
            }
            navigate("/")
        }
        catch(err){
            console.error("handlePublish Error:", err)
            alert("Error in Publishing: "+ (err.message || err))
            throw err;
        }
        finally {
            setPublish(false)
        }
        
    }
    
    return (
        <div className="max-w-5xl mx-auto my-10 px-4">
            <h1 className="text-3xl font-extrabold text-gray-900 pb-2 mb-6 border-b border-gray-200">Create A New Post</h1>

             <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                </label>
                <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                id="title"
                name="title"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter the post title" 
                />
            </div>

            <div className="flex flex-col sm:flex-row sm:space-x-4 mb-6">
                <div className="w-full sm:w-1/2 mb-4 sm:mb-0">
                    <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                        Slug
                    </label>
                    <input 
                    type="text"
                    id="slug"
                    name="slug"
                    placeholder="Enter the slug (Optional)"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="border mt-1 block w-full px-3 py-2 border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                    />    
                </div>
                <div className="w-full sm:w-1/2">
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                        Tags
                    </label>
                    <input 
                    type="text"
                    id="tags"
                    name="tags"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)} 
                    placeholder="eg. tag1, tag2"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
            </div>

            <div className="mb-4">
                <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
                    Summary
                </label>
                <textarea 
                name="summary" 
                id="summary" 
                rows={3}
                placeholder="Short Summary shown on Blog Cards"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>

            <div className="mb-4">
                <button 
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-500">
                    {creating? "Creating...": "Create Post"}
                </button>
                {postId && <span className="ml-3 text-sm text-gray-600">Post ID: {postId}</span>}
            </div>

            <SimpleEditor html={html} setHtml={setHtml}/>

            <div className="flex justify-start mt-4 gap-3">
                <button 
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-500"
                >
                    {saving? "Saving ...": "Save"}
                </button>
            </div>

            <div style={{ marginTop: 18 }}>
                <strong>HTML output (preview)</strong>
                <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6, marginTop: 8 }}>
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                </div>
            </div>
            

            <button 
            onClick={handlePublish}
            disabled={publish}
            className='bg-green-500 hover:bg-green-600 text-white mt-4 font-bold py-2 px-4 rounded-lg cursor-pointer transition duration-300 ease-in-out'>
                {publish? "Publishing ...":"Publish"}
            </button>
        </div>
    );
}