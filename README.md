# FilesBoard

This project is a web-based file sharing dashboard that allows you to upload, view, and manage your files. It features a modern, responsive interface with drag-and-drop file upload capabilities, file previews, and secure file sharing options.

## Demo

![demo.gif](.github/demo.gif)

## Features

- User authentication
- Drag-and-drop file upload
- Multiple file upload support
- File preview for images, videos, and text files
- Secure file sharing with temporary public links
- File management (delete, preview)
- Responsive design for desktop and mobile devices

## Technologies Used

- FastAPI
- HTML5
- CSS3 (with Tailwind CSS framework)
- JavaScript

## Usage

1. Configure your account in config.py.
2. Log in to your account in /login. JWT will be stored in your Local Storage.
3. On the dashboard, you can:
- Upload files by dragging and dropping them into the designated area or by clicking to select files.
- View your uploaded files in a grid layout.
- Generate temporary public links for sharing files.
- Delete files you no longer need.
- Preview files directly in the browser (for supported file types).

## Security

- All file operations require user authentication.
- File sharing uses temporary tokens for secure, time-limited access.
