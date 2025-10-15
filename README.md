# 🚀 Project Setup Guide

## 🧩 Prerequisites
- 🍃 **MongoDB**
- 🟢 **Node.js**

---

## 🧠 How to Run This Project Locally

### 🖥️ Backend Setup
1. Navigate to the backend directory:
```bash
cd ./backend/app
```  
2. Start the FastAPI backend server:  
```bash
uvicorn main:app --reload
```  
3. Start the HTTP file server:  
```bash
npx http-server ./uploads -p 80001 --cors
```  
### 🖥️ Frontend Setup  
4. Navigate to the frontend directory:  
```bash
cd ./frontend
```   
5. Start the React + Vite development server:  
```bash
npm run dev
```  
✅ Once both servers are running, your project should be live locally!
