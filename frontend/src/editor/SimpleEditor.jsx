import React, { useState } from "react";
import FroalaEditor from "react-froala-wysiwyg";

export default function FroalaEditorV2({html, setHtml}) {

    const config = {
        placeholderText: "Start writing your blog post ... ",
        charCounterCount: true,
        imageUploadURL: "http://localhost:8000/uploadimgs", // adapt host/port in prod
        imageUploadMethod: "POST",
    }

    return (
        <div>
            <FroalaEditor 
                tag="textarea"
                config={config}
                model={html}
                onModelChange={(model) => setHtml(model)}
            />
            <div style={{ marginTop: 18 }}>
                <strong>HTML output (preview)</strong>
                <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 6, marginTop: 8 }}>
                <div dangerouslySetInnerHTML={{ __html: html }} />
                </div>
            </div>
        </div>
    );
}