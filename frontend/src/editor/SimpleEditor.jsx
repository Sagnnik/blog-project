import React, { useEffect, useMemo } from "react";
import FroalaEditor from "react-froala-wysiwyg";

import "froala-editor/css/froala_style.min.css";
import "froala-editor/css/froala_editor.pkgd.min.css";
import "froala-editor/js/plugins.pkgd.min.js";
import "font-awesome/css/font-awesome.css";
import "froala-editor/css/themes/dark.min.css";
import "froala-editor/js/plugins/paragraph_format.min.js";
import "froala-editor/js/plugins/code_beautifier.min.js";
import "froala-editor/js/plugins/code_view.min.js";
import "./froala-dark-overrides.css";

export default function SimpleEditor({ html, setHtml }) {
  const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN;

  useEffect(() => {
    if (typeof window === "undefined" || !window.FroalaEditor) return;

    const FE = window.FroalaEditor;
    if (!FE.DefineIcon || !FE.RegisterCommand) return;

    try {
      if (!FE.DefineIcon.__inline_code_defined) {
        FE.DefineIcon("inlineCode", { NAME: "code" });
        FE.RegisterCommand("inlineCode", {
          title: "Inline Code",
          focus: true,
          undo: true,
          refreshAfterCallback: true,
          callback: function () {
            const editor = this;
            const sel = window.getSelection();
            if (!sel || !sel.rangeCount) return;
            const range = sel.getRangeAt(0);

            const editableEl = editor.el;
            if (!editableEl.contains(range.commonAncestorContainer)) return;

            const selectedText = range.toString();
            if (!selectedText) {
              const codeNode = document.createElement("code");
              codeNode.textContent = "";
              range.insertNode(codeNode);

              range.setStart(codeNode, 0);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
              editor.events.trigger("contentChanged");
              return;
            }

            const codeNode = document.createElement("code");
            codeNode.textContent = selectedText;

            range.deleteContents();
            range.insertNode(codeNode);

            range.setStartAfter(codeNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);

            editor.events.trigger("contentChanged");
          },
        });

        FE.DefineIcon.__inline_code_defined = true;
      }
    } catch (err) {
      console.warn("Inline code registration failed:", err);
    }
  }, []);

  const config = useMemo(
    () => ({
      theme: "dark",
      heightMin: 250,
      toolbarButtons: [
        [
          "paragraphFormat",
          "bold",
          "italic",
          "underline",
          "strikeThrough",
          "fontSize",
          "inlineCode",
          "subscript",
          "superscript",
          "insertHR",
          "|",
          "formatOL",
          "formatUL",
          "insertLink",
          "insertImage",
          "insertCode",
          "|",
          "align",
          "undo",
          "redo",
          "|",
          "html",
          "fullscreen",
          "wirisEditor",
          "wirisChemistry"
        ],
      ],
      paragraphFormat: {
        N: "Normal",
        H1: "Heading 1",
        H2: "Heading 2",
        H3: "Heading 3",
        H4: "Heading 4",
      },
      codeMirrorOptions: {
        theme: "material-darker",
        lineNumbers: true,
        mode: "htmlmixed",
      },
      codeBeautifierOptions: {
        end_with_newline: true,
        indent_inner_html: true,
      },
      placeholderText: "Start writing your blog post ... ",
      charCounterCount: true,
      imageUploadURL: "http://localhost:8000/api/assets",
      imageUploadMethod: "POST",
      requestHeaders: ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {},
      events: {
        initialized: function (e, editor) {
        },
        "image.error": function (e, editor, error, response) {
          console.error("Froala image error:", error, response);
        },
        "image.uploaded": function (e, editor, response) {
          console.log("Image uploaded, server response:", response);
        },
      },
    }),
    [ADMIN_TOKEN]
  );

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
