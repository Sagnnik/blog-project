import React, { useEffect, useState } from "react";
import SimpleEditor from "./SimpleEditor";
import { slugify, buildFullHtml, parseTags } from './utils';
import { useParams, useNavigate} from "react-router-dom";
import Button from "../components/Button";
import Navbar from "../components/Navbar";
import { useForm } from "react-hook-form";
import { usePost } from "./usePost";

export default function PublishHtml () {
    const BASE = import.meta.env.VITE_FASTAPI_BASE_URL || "http://localhost:8000";

    const navigate = useNavigate();
    const {postId} = useParams();

    const [html, setHtml] = useState("");
    //Cover image states
    const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
    const [coverImageFile, setCoverImageFile] = useState(null);
    const [coverImageAsset, setCoverImageAsset] = useState(null);

    const { postQuery, saveMutation, uploadAssetMutation } = usePost(postId);
    const { data: postData, isLoading: postLoading } = postQuery;

    const { register, handleSubmit, reset, control, watch } = useForm({
        defaultValues: {
            title: "",
            slug: "",
            tagsText: "",
            summary: "",
            coverCaption: ""
        }
    });

    useEffect(() => {
        if(!postData) return;
        const tagsText = Array.isArray(postData.tags) ? postData.tags.join(", ") : "";
        
        reset({
            title: postData.title || "",
            slug: postData.slug || "",
            tagsText,
            summary: postData.summary || "",
            coverCaption: postData.cover_image?.caption || "",
        });

        if (postData.raw) setHtml(postData.raw);
        if (postData.cover_image) {
            const link = postData.cover_image.public_link || postData.cover_image.link;
            if (link) {
                setCoverPreviewUrl(link);
                setCoverImageAsset({ 
                    id: postData.cover_image.asset_id || postData.cover_image.id, 
                    link
                })
            }
        }
    }, [postData, reset]);

    function handleCoverFileChange(e) {
        const file = e?.target?.files?.[0];
        if (!file) {
        if (coverPreviewUrl && coverPreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(coverPreviewUrl);
        }
        setCoverImageFile(null);
        setCoverPreviewUrl("");
        setCoverImageAsset(null);
        return;
        }
        if (coverPreviewUrl && coverPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreviewUrl);
        }
        setCoverImageFile(file);
        setCoverPreviewUrl(URL.createObjectURL(file));
        setCoverImageAsset(null);
    }

    function handleRemoveCover() {
        if (coverPreviewUrl && coverPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreviewUrl);
        }
        setCoverImageFile(null);
        setCoverPreviewUrl("");
        setCoverImageAsset(null);
    }

    async function uploadCoverImageIfAny(title, coverCaption) {
        if (!coverImageFile) {
        return coverImageAsset || null;
        }
        const form = new FormData();
        form.append("file", coverImageFile, coverImageFile.name);
        form.append("alt", `Cover image for ${title || "post"}`);
        form.append("caption", (coverCaption && coverCaption.trim()) || title || "");
        if (postId) form.append("post_id", postId);

        const result = await uploadAssetMutation.mutateAsync({ formData: form, endpoint: `${BASE}/api/assets/` });
        const id = result.id || result.asset_id || result.assetId;
        const link = result.link || result.public_link || result.url;
        const asset = { id, link };
        setCoverImageAsset(asset);
        setCoverImageFile(null);
        return asset;
    }

    // Save handler (called via RHF handleSubmit)
    async function onSave(values) {
        try {
        const title = values.title?.trim();
        const payload = {
            title,
            slug: (values.slug?.trim() || slugify(title)),
            tags: parseTags(values.tagsText),
            summary: values.summary?.trim(),
            raw: html,
            body: buildFullHtml(title, html, coverPreviewUrl, values.coverCaption, { hMargin: "5px", bgOpacity: 0.95 }),
            status: "draft",
        };

        try {
            const coverAsset = await uploadCoverImageIfAny(title, values.coverCaption);
            // if (coverAsset && coverAsset.id) {
            //     payload.cover_image = { asset_id: coverAsset.id, public_link: coverAsset.link };
            // }
        } catch (imgErr) {
            console.error("Image upload failed:", imgErr);
            alert("Cover image upload failed: " + (imgErr.message || imgErr));
        }

        await saveMutation.mutateAsync(payload);
        console.log("Saved successfully");
        } catch (err) {
        console.error("Save error:", err);
        alert("Error saving post: " + (err.message || err));
        }
    }

    async function onCreate(values) {
        await onSave(values);
    }

    // Publish: build final HTML blob, upload to assetsHtml endpoint and open preview
    async function onPublish(values) {
        try {
        await onSave(values);

        const now = new Date();
        const options = {
            day: "numeric",
            month: "long",
            year: "numeric",
        };
        const formattedDate = now.toLocaleDateString("en-GB", options);

        const finalHtml = buildFullHtml(
            values.title?.trim(),
            html,
            coverPreviewUrl,
            values.coverCaption,
            { hMargin: "5px", bgOpacity: 0.95 },
            formattedDate
        );

        const finalSlug = (values.slug?.trim() || slugify(values.title || ""));
        const filename = `${finalSlug.replace(/\s+/g, "-").toLowerCase()}-post.html`;
        const blob = new Blob([finalHtml], { type: "text/html" });
        const form = new FormData();
        form.append("file", blob, filename);
        form.append("alt", `HTML snapshot for ${values.title || ""}`);
        form.append("caption", values.title || values.coverCaption?.trim() || "");
        if (postId) form.append("post_id", postId);

        const result = await uploadAssetMutation.mutateAsync({ formData: form, endpoint: `${BASE}/api/assets/html` });

        const assetLink = result.link || result.public_link;
        if (assetLink) {
            window.open(assetLink, "_blank");
        }
        navigate("/admin");
        } catch (err) {
        console.error("Publish error:", err);
        alert("Error publishing post: " + (err.message || err));
        }
    }

    const watchedTitle = watch("title");
    
    return (
        <div className="bg-black/90">
            <Navbar />
        <div className="max-w-5xl mx-auto my-10 px-4 text-gray-100">
            <h1 className="text-3xl font-extrabold font-mono text-gray-300 pb-2 mb-6 border-b border-gray-200">Create A New Post</h1>

            <form onSubmit={handleSubmit(onSave)}>
             <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                    Title
                </label>
                <input 
                {...register("title", { required: true })}
                type="text"
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
                    {...register("slug")}
                    type="text"
                    id="slug"
                    name="slug"
                    placeholder="Enter-the-slug-(Optional)"
                    className="border mt-1 block w-full px-3 py-2 border-gray-300 placeholder-gray-300 rounded-md focus:outline-none focus:ring-terra focus:border-terra sm:text-sm" 
                    />    
                </div>
                <div className="w-full sm:w-1/2">
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">
                        Tags
                    </label>
                    <input 
                    {...register("tagsText")}
                    type="text"
                    id="tagsText"
                    name="tagsText"
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
                {...register("summary")}
                name="summary" 
                id="summary" 
                rows={3}
                placeholder="Short Summary shown on Blog Cards"
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
                        {...register("coverCaption")}
                        id="coverCaption"
                        type="text"
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
                    type="button"
                    className="ml-3"
                    onClick={handleSubmit(onSave)}
                    disabled={saveMutation.isLoading}
                    variant="primary"
                >
                    {saveMutation.isLoading ? "Creating..." : "Create Post"}
                </Button>
                {postId && <span className="ml-3 text-sm text-gray-400">Post ID: {postId}</span>}
            </div>
            </form>

            <SimpleEditor html={html} setHtml={setHtml}/>

            <div className="flex justify-start mt-4 gap-3">
                <Button
                    onClick={handleSubmit(onSave)}
                    disabled={saveMutation.isLoading}
                    variant="primary"
                >
                    {saveMutation.isLoading ? "Saving ..." : "Save"}
                </Button>
            </div>

            <div style={{ marginTop: 18 }}>
                <strong>HTML output (preview)</strong>
                <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6, marginTop: 8 }}>
                    <div dangerouslySetInnerHTML={{ __html: buildFullHtml(
                        (watchedTitle || "").trim(),
                        html, 
                        coverPreviewUrl,
                        "This a test cover image", 
                        { hMargin: "5px", bgOpacity: 0.50 })}} />
                </div>
            </div>
            

            <button 
            onClick={handleSubmit(onPublish)}
            disabled={uploadAssetMutation?.isLoading || saveMutation.isLoading}
            className='bg-green-800 hover:bg-green-700 text-white mt-4 font-bold py-2 px-4 rounded-lg cursor-pointer transition duration-300 ease-in-out'>
                {uploadAssetMutation?.isLoading ? "Publishing..." : "Publish"}
            </button>
        </div>
        </div>
    );
}
