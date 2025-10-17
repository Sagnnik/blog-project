import { useState } from 'react'
import PublishHtml from './editor/PublishHtml';
import AdminBlogPage from './pages/AdminBlogPage';
import PostPreview from './pages/PostPreview';
import {BrowserRouter as Router, Routes, Route} from "react-router-dom"
import About from "./pages/About";
import Tags from "./pages/Tags";
import AdminRoute from './components/AdminRoute';
import PublicBlogPage from './pages/PublicBlogPage';


function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<PublicBlogPage />} />
        <Route path='/about' element={<About />} />
        <Route path='/tags' element={<Tags />} />
        <Route path='/admin/publish/:postId' element={<AdminRoute><PublishHtml /></AdminRoute>} />
        <Route path='/admin' element={<AdminRoute><AdminBlogPage /></AdminRoute>} />
      </Routes>
    </Router>
  );
}

export default App
