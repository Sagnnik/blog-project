import React, { useState } from "react";
import FroalaEditor from "react-froala-wysiwyg";

export default function SimpleEditor({html, setHtml}) {

    const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN;

    const config = {
        placeholderText: "Start writing your blog post ... ",
        charCounterCount: true,
        imageUploadURL: "http://localhost:8000/api/assets", // ?? Need to change this
        imageUploadMethod: "POST",

        requestHeaders: ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {},
        events: {
            'image.error': function (e, editor, error, response) {
                console.error('Froala image error:', error, response);
                // optional: show a toast to the user
            },
            'image.uploaded': function (e, editor, response) {
                // response is the raw server response (string). Useful for debugging.
                console.log('Image uploaded, server response:', response);
            }
        }
    };

    return (
        <div>
            <FroalaEditor 
                tag="textarea"
                config={config}
                model={html}
                onModelChange={(model) => setHtml(model)}
            />
        </div>
    );
}