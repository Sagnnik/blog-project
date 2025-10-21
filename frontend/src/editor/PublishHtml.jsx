import React, { useEffect, useState } from "react";
import SimpleEditor from "./SimpleEditor";
import { slugify, buildFullHtml, parseTags } from './utils';
import { useParams, useNavigate} from "react-router-dom";
import Button from "../components/Button";
import Navbar from "../components/Navbar";
import { useAuth } from "@clerk/clerk-react";

export default function PublishHtml () {

    const navigate = useNavigate();
    const {postId} = useParams();

    const { getToken } = useAuth();
    const BACKEND_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || "http://localhost:8000";
    
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [tagsText, setTagsText] = useState("");
    const [summary, setSummary] = useState("");

    const [html, setHtml] = useState("");
    const [publish, setPublish] = useState(false);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);
    const [loading, setLoading] = useState(false);


    //Cover image states
    const [coverImageFile, setCoverImageFile] = useState(null);
    const [coverImageAsset, setCoverImageAsset] = useState(null);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState('');
    const [coverImageCaption, setCoverImageCaption] = useState("");

    async function authFetch(url, options = {}) {
        const token = await getToken();
        const headers = {
            ...(options.headers || {} ),
            "Authorization": `Bearer ${token}`,
        };
        if (!(options.body instanceof FormData)) {
            headers["Content-Type"] = "application/json";
        }
        const res = await fetch(url, { ...options, headers });
        return res;     
    };

    useEffect(() => {
        if (!postId) return;
        let cancelled = false;

        async function fetchPost() {
            setLoading(true);
            try {
                const url = `${BACKEND_BASE_URL}/api/posts/${postId}`;
                const res = await authFetch(url);

                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(`Failed to fetch post: ${res.status} ${txt || ""}`);
                }
                const data = await res.json();
                if (cancelled) return;

                if (data.title) setTitle(data.title);
                if (data.summary) setSummary(data.summary);
                if (Array.isArray(data.tags)) {
                    setTagsText(data.tags.join(", "))
                }
                if (data.raw) setHtml(data.raw);
                if (data.cover_image){
                    const { asset_id: coverId, public_link: coverLink, caption } = data.cover_image;
                    if (coverId || coverLink) {
                        setCoverImageAsset({ id: coverId, link: coverLink });
                        setCoverPreviewUrl(coverLink);
                    }
                    if (caption) {
                        setCoverImageCaption(caption);
                    }
                }   
            }
            catch(err) {
                console.error("Error fetching post:", err);
                if (err.stack) console.error(err.stack);
               alert("Error loading post for edit: " + (err.message || err));
            }
            finally{
                if (!cancelled) setLoading(false);
            }
            
        }
        fetchPost();
        return () => {cancelled = true;}

    }, [postId, BACKEND_BASE_URL, getToken]);

    function handleCoverFileChange(e) {
        const file = e?.target?.files?.[0]; 
        if (!file) {
            if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(coverPreviewUrl);
            }
            setCoverImageFile(null);
            setCoverPreviewUrl('');
            return;
        }
        if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(coverPreviewUrl);
        }

        setCoverImageFile(file);
        setCoverPreviewUrl(URL.createObjectURL(file));
        setCoverImageAsset(null); 
    }

    function handleRemoveCover() {
        if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(coverPreviewUrl);
        }
        setCoverImageFile(null);
        setCoverPreviewUrl('');
        setCoverImageAsset(null);
    }

    async function uploadCoverImage() {
        if (!coverImageFile) {
            return coverImageAsset || null;
        }

        const form = new FormData();
        form.append("file", coverImageFile, coverImageFile.name);
        form.append("alt",  `Cover image for ${title || "post"}`);
        form.append("caption", coverImageCaption?.trim() || title || "");
        if (postId) form.append("post_id", postId);

        const url = `${BACKEND_BASE_URL}/api/assets/`;
        const res = await authFetch(url, {
            method: "POST",
            body: form
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Cover image upload failed: ${res.status} ${txt}`);
        }
        const data = await res.json();
        const id = data.id || data.asset_id || data.assetId;
        const link = data.link || data.public_link || data.url;

        if (link) {
            try {
                await fetch(link).catch((e) => {
                    console.warn("fetch(public link) warning:", e);
                });
            }
            catch (e) {
            console.warn("fetch(public link) error:", e);
            }
        }
        const asset = { id, link };
        setCoverImageAsset(asset);
        setCoverImageFile(null);
        return asset;
    }

    async function handleCreate() {
        try {
            setCreating(true);

            let coverAsset = null;
            try {
                coverAsset = await uploadCoverImage();
            }
            catch (imgErr) {
                console.error("Image Upload error: ", imgErr);
                alert("Cover Image Upload failed: " + (imgErr.message || imgErr));
                coverAsset = null;
            }

            const payload = {
                title: title.trim(),
                slug: slug.trim() || slugify(title),
                tags: parseTags(tagsText),
                summary: summary.trim(),
                status: "draft",
            }

            const url = `${BACKEND_BASE_URL}/api/posts/${postId}`;
            const res = await authFetch(url, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Create Failed: ${res.status} ${txt}`);
            }
        }
        catch(err) {
            console.error("handleCreate Error:", err);
            alert("Error creating post: " + (err.message || err));
            throw err;
        }
        finally {
            setCreating(false);
        }
    }

    async function handleSave() {
        try {
            setSaving(true);
            const payload = {
                title: title.trim(),
                slug: slug.trim() || slugify(title),
                tags: parseTags(tagsText),
                summary: summary.trim(),
                raw: html,
                body: buildFullHtml(title, html, coverPreviewUrl, coverImageCaption, { hMargin: "5px", bgOpacity: 0.95 }),
                status: "draft"
            };

            const url = `${BACKEND_BASE_URL}/api/posts/${postId}`;
            const res = await authFetch(url, {
                method:"PATCH",
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
            const now = new Date();
            const options = {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            };

            const formattedDate = now.toLocaleDateString('en-GB', options);

            const finalHtml = buildFullHtml(title, html, coverPreviewUrl, coverImageCaption, { hMargin: "5px", bgOpacity: 0.95 }, formattedDate);

            const finalSlug = slug.trim() || slugify(title);
            const filename = `${finalSlug.replace(/\s+/g, "-").toLowerCase()}-post.html`
            const blob = new Blob([finalHtml], {type: "text/html"})
            const form = new FormData();
            form.append("file", blob, filename);
            form.append("alt", `HTML snapshot for ${title}`);
            form.append("caption", title || coverImageCaption?.trim());
            form.append("post_id", postId)

            // Upload the final html as asset
            const url = `${BACKEND_BASE_URL}/api/assets/html`;
            const assetsRes = await authFetch(url, {
                method:"POST",
                body: form
            });

            if (!assetsRes.ok) {
                const txt = await assetsRes.text();
                throw new Error(`Asset upload failed: ${assetsRes.status} ${txt}`);
            }
            const assetData = await assetsRes.json();

            const assetId = await assetData.id || assetData.asset_id;
            const assetLink = await assetData.link || assetData.public_link;

            console.log("Published Successfully")
            const previewUrl = assetLink
            if (previewUrl) {
                window.open(previewUrl, "_blank");
            }
            navigate("/admin")
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
        <div className="bg-black/90">
            <Navbar />
        <div className="max-w-5xl mx-auto my-10 px-4 text-gray-100">
            <h1 className="text-3xl font-extrabold font-mono text-gray-300 pb-2 mb-6 border-b border-gray-200">Create A New Post</h1>

             <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                    Title
                </label>
                <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                id="title"
                name="title"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 placeholder-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-terra focus:border-terra sm:text-sm"
                placeholder="Enter the post title" 
                />
            </div>

            <div className="flex flex-col sm:flex-row sm:space-x-4 mb-6">
                <div className="w-full sm:w-1/2 mb-4 sm:mb-0">
                    <label htmlFor="slug" className="block text-sm font-medium text-gray-300 mb-1">
                        Slug
                    </label>
                    <input 
                    type="text"
                    id="slug"
                    name="slug"
                    placeholder="Enter-the-slug-(Optional)"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="border mt-1 block w-full px-3 py-2 border-gray-300 placeholder-gray-300 rounded-md focus:outline-none focus:ring-terra focus:border-terra sm:text-sm" 
                    />    
                </div>
                <div className="w-full sm:w-1/2">
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">
                        Tags
                    </label>
                    <input 
                    type="text"
                    id="tags"
                    name="tags"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)} 
                    placeholder="eg. tag1, tag2"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 placeholder-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-terra focus:border-terra sm:text-sm"
                    />
                </div>
            </div>

            <div className="mb-4">
                <label htmlFor="summary" className="block text-sm font-medium text-gray-300 mb-1">
                    Summary
                </label>
                <textarea 
                name="summary" 
                id="summary" 
                rows={3}
                placeholder="Short Summary shown on Blog Cards"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 placeholder-gray-300 rounded-md focus:outline-none focus:ring-terra focus:border-terra sm:text-sm"
                />
            </div>

            <div className="mb-6">
                <label
                    htmlFor="coverImage"
                    className="block text-sm font-medium text-gray-300 mb-1">
                    Cover Image
                </label>

                <div className="flex items-center space-x-4">
                    <input 
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileChange}
                    />

                    <div className="flex items-center space-x-3">
                    <Button
                    onClick={handleRemoveCover}
                    variant="danger">
                        Remove
                    </Button>

                    <span className="text-sm text-gray-200">
                        {coverImageAsset
                        ? "Existing Cover Image Attached"
                        : coverImageFile
                        ? coverImageFile.name
                        : "No Cover Image Attached"}
                    </span>
                    </div>
                </div>

                <div className="mt-3">
                    <label htmlFor="coverCaption" className="block text-sm font-medium text-gray-300 mb-1">
                        Cover Image Caption (optional — defaults to title if left empty)
                    </label>
                    <input
                        id="coverCaption"
                        type="text"
                        value={coverImageCaption}
                        onChange={(e) => setCoverImageCaption(e.target.value)}
                        placeholder="Caption for cover image"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 placeholder-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-terra focus:border-terra sm:text-sm"
                    />
                </div>

                {coverPreviewUrl && (
                    <div className="mt-4">
                    <p className="text-sm text-gray-300 mb-2">Preview:</p>
                    <div className="border rounded-lg overflow-hidden shadow-sm w-1/2">
                        <img
                        src={coverPreviewUrl}
                        alt="Cover preview"
                        className="object-cover w-full h-40"
                        />
                    </div>
                    </div>
                )}

                <p className="text-xs text-gray-400 mt-2">
                    Recommended: landscape images. Will show on blog card and post top.
                </p>
            </div>
            
            <div className="mb-4">
                <Button 
                onClick={handleCreate}
                disabled={creating}
                variant="primary">
                    {creating? "Creating...": "Create Post"}
                </Button>
                {postId && <span className="ml-3 text-sm text-gray-400">Post ID: {postId}</span>}
            </div>

            <SimpleEditor html={html} setHtml={setHtml}/>

            <div className="flex justify-start mt-4 gap-3">
                <Button 
                onClick={handleSave}
                disabled={saving}
                variant="primary"
                >
                    {saving? "Saving ...": "Save"}
                </Button>
            </div>

            <div style={{ marginTop: 18 }}>
                <strong>HTML output (preview)</strong>
                <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6, marginTop: 8 }}>
                    <div dangerouslySetInnerHTML={{ __html: buildFullHtml(
                        title.trim(), 
                        html, 
                        coverPreviewUrl,
                        "This a test cover image", 
                        { hMargin: "5px", bgOpacity: 0.50 })}} />
                </div>
            </div>
            

            <button 
            onClick={handlePublish}
            disabled={publish}
            className='bg-green-800 hover:bg-green-700 text-white mt-4 font-bold py-2 px-4 rounded-lg cursor-pointer transition duration-300 ease-in-out'>
                {publish? "Publishing ...":"Publish"}
            </button>
        </div>
        </div>
    );
}
