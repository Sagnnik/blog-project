# Full Stack Blog Project

This is a full-stack blog application with a React frontend and a Python FastAPI backend.

## Features

*   **Frontend:**
    *   Built with React and Vite for a fast and modern development experience.
    *   User authentication powered by Clerk.
    *   Rich text editor for creating and editing blog posts.
    *   Styling with Tailwind CSS.
*   **Backend:**
    *   Built with FastAPI, a modern, fast (high-performance) web framework for building APIs with Python.
    *   MongoDB for the database, using the `motor` driver for asynchronous operations.
    *   S3-compatible object storage for assets.
    *   Secure API endpoints with Clerk authentication.

*   **Endpoints:**

*   `app/main.py`: The main application entry point, where the FastAPI app is initialized and configured.
*   `app/routers/`: Contains the API endpoint definitions, separated into logical groups (posts, public, assets).
*   `app/db.py`: Handles the database connection and session management.
*   `app/models.py`: Defines the data models for the application (e.g., `PostCreate`, `PostUpdate`).
*   `app/deps.py`: Contains dependency injection functions, such as for requiring admin authentication.
*   `app/objectstore.py`: Manages the connection to the S3-compatible object store.

## Technologies Used

*   **Frontend:**
    *   React
    *   Vite
    *   Clerk
    *   React Query
    *   Tailwind CSS
*   **Backend:**
    *   Python
    *   FastAPI
    *   MongoDB (motor)
    *   Boto3 (for S3)
    *   Clerk

## Getting Started

### Prerequisites

*   Python 3.12+
*   Node.js and npm
*   MongoDB instance
*   S3-compatible object storage bucket
*   Clerk account

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd blog
    ```

2.  **Backend Setup:**

    *   Navigate to the `backend` directory:
        ```bash
        cd backend
        ```
    *   Install Python dependencies:
        ```bash
        uv pip install -r requirements.txt
        ```
    *   Create a `.env` file and add the following environment variables:
        ```
        R2_BUCKET=<your-r2-bucket-name>
        CLERK_SECRET_KEY=<your-clerk-secret-key>
        MONGO_URI=<your-mongodb-uri>
        UPLOAD_DIR=./uploads
        BACKEND_BASE=http://localhost:8000
        ```
    *   Initialize the database indexes:
        ```bash
        python app/init_index.py
        ```
    *   Run the backend server:
        ```bash
        uvicorn app.main:app --reload
        ```
        The backend will be running at `http://localhost:8000`.

3.  **Frontend Setup:**

    *   Navigate to the `frontend` directory:
        ```bash
        cd ../frontend
        ```
    *   Install Node.js dependencies:
        ```bash
        npm install
        ```
    *   Create a `.env` file and add your Clerk publishable key:
        ```
        VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
        ```
    *   Run the frontend development server:
        ```bash
        npm run dev
        ```
        The frontend will be running at `http://localhost:5173`.

## Usage

Once both the backend and frontend servers are running, you can access the application in your browser at `http://localhost:5173`. You will be able to create an account, log in, and start creating blog posts.