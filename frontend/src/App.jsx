import { useState } from 'react'
import PublishHtml from './editor/PublishHtml';
import AdminBlogPage from './pages/AdminBlogPage';
import PostPreview from './pages/PostPreview';
import {BrowserRouter as Router, Routes, Route} from "react-router-dom"
import About from "./pages/About";
import Tags from "./pages/Tags";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminBlogPage />} />
        <Route path= "/about" element={<About />} />
        <Route path= "/tags" element={<Tags />} />
        <Route path='/admin/publish/:postId' element={<PublishHtml />} />
        <Route path='/article/:slug' element={<PostPreview />} />
      </Routes>
    </Router>
  );
}

export default App
