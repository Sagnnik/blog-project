import { useState } from 'react'
import PublishHtml from './editor/PublishHtml';
import AdminBlogPage from './components/AdminBlogPage';
import {BrowserRouter as Router, Routes, Route} from "react-router-dom"
import About from "./pages/About";
import Tags from "./pages/Tags";
// Froala Imports
import "froala-editor/css/froala_style.min.css";
import "froala-editor/css/froala_editor.pkgd.min.css";
import 'froala-editor/js/plugins.pkgd.min.js';
import "font-awesome/css/font-awesome.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminBlogPage />} />
        <Route path='/admin/publish/:postId' element={<PublishHtml />} />
        <Route path= "/about" element={<About />} />
        <Route path= "/tags" element={<Tags />} />
      </Routes>
    </Router>
  );
}

export default App
