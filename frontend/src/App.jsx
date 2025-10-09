import { useState } from 'react'
import PublishHtml from './editor/PublishHtml';
/* Froala editor styles */
import "froala-editor/css/froala_style.min.css";
import "froala-editor/css/froala_editor.pkgd.min.css";

/* import plugin */
import 'froala-editor/js/plugins.pkgd.min.js';

/* optional theme/icon fonts */
import "font-awesome/css/font-awesome.css";

function App() {
  return (
    <div>
      <PublishHtml />
    </div>
  );
}

export default App
