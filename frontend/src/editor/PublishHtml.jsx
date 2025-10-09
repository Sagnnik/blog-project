import React, { useState } from "react";
import SimpleEditor from "./SimpleEditor";
import 'dotenv/config'

export default function PublishHtml () {
    const [html, setHtml] = useState("");
    const [publish, setPublish] = useState(false);
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

    async function handlePublish() {
        try {
            setPublish(true);

            const fullHtml = `
            <!doctype html>
                <html>
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>Preview</title>
                    <style>
                    body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: 28px; }
                    pre { background:#06203a; color:#e6f0ff; padding:12px; border-radius:8px; overflow:auto; }
                    </style>
                </head>
                <body>
                    ${html}
                </body>
                </html>
            `;
                // ?? have to change the link
                const res = await fetch('http://localhost:8000/publish', {
                method:"POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${ADMIN_TOKEN}`,
                },
                body: JSON.stringify({html: fullHtml})
                })

                if (!res.ok) {
                    const txt = await res.text()
                    throw new Error(`Publish Failed: ${res.status} ${txt}`)
                }
                const data = await res.json();
                const previewUrl = data.preview_url;
                
                if (!previewUrl) {
                    alert("Published but preview URL is missing")
                    return;
                }
                // Open the preview in a new tab
                window.open(previewUrl, "_blank");
            }
            catch(err) {
            console.error(err);
            alert("Error publishing: "+(err.message || err));
            }
            finally {
            setPublish(false);
            }       
    }
    return (
        <div className='max-w-3xl mx-auto my-10 px-4'>
            <h1>Froala Starter</h1>
            <p>Test the editor. The HTML output is available in the preview below; send it to your publish API when ready.</p>

            <SimpleEditor html={html} setHtml={setHtml}/>
            <button 
            onClick={handlePublish} 
            disabled={publish}
            className='bg-green-500 hover:bg-green-600 text-white mt-4 font-bold py-2 px-4 rounded-lg cursor-pointer transition duration-300 ease-in-out'>
                {publish? "Publishing ...":"Publish"}
            </button>
        </div>
    );
}