from typing import Optional
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import shutil
import json

from config import users
from helpers import generate_short_url, save_short_url, get_file_path
from auth import AuthHandler
from models import AuthDetails

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

auth_handler = AuthHandler()


@app.post("/api/login")
async def login(auth_details: AuthDetails):
    user = users.get(auth_details.username)
    if (user is None) or (not auth_handler.verify_password(auth_details.password, user["password"])):
        raise HTTPException(status_code=401, detail='Invalid username and/or password')
    token = auth_handler.encode_token(auth_details.username)
    return {"token": token}


@app.post("/api/upload")
async def upload_file(folder: Optional[str] = None, file: UploadFile = File(...), _=Depends(auth_handler.auth_wrapper)):
    try:
        file_location = get_file_path(file.filename, folder)
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        return {"filename": file.filename}
    except IOError:
        raise HTTPException(status_code=403, detail="Path traversal attempt")


@app.post("/api/create_folder")
async def create_folder(folder_name: str, folder: Optional[str] = None, _=Depends(auth_handler.auth_wrapper)):
    try:
        folder_path = get_file_path(folder_name, folder)
        if os.path.exists(folder_path):
            raise HTTPException(status_code=400, detail="Folder already exists")
        os.makedirs(folder_path)
        return {"message": f"Folder {folder_name} created successfully"}
    except IOError:
        raise HTTPException(status_code=403, detail="Path traversal attempt")


@app.get("/api/files")
async def list_files(folder: Optional[str] = None, _=Depends(auth_handler.auth_wrapper)):
    try:
        path = get_file_path("", folder)
        files = os.listdir(path)
        return {"files": files}
    except IOError:
        raise HTTPException(status_code=403, detail="Path traversal attempt")


@app.delete("/api/files/{filename}")
async def delete_file(filename: str, folder: Optional[str] = None, _=Depends(auth_handler.auth_wrapper)):
    try:
        file_path = get_file_path(filename, folder)
        if os.path.exists(file_path):
            if os.path.isdir(file_path):
                shutil.rmtree(file_path)
            else:
                os.remove(file_path)
            return {"message": f"File {filename} deleted successfully"}
    except IOError:
        raise HTTPException(status_code=403, detail="Path traversal attempt")

    raise HTTPException(status_code=404, detail="File not found")


@app.put("/api/rename/{old_name}")
async def rename_file(old_name: str, new_name: str, folder: Optional[str] = None, _=Depends(auth_handler.auth_wrapper)):
    try:
        old_path = get_file_path(old_name, folder)
        new_path = get_file_path(new_name, folder)
        if not os.path.exists(old_path):
            raise HTTPException(status_code=404, detail="File not found")
        if os.path.exists(new_path):
            raise HTTPException(status_code=400, detail="File with new name already exists")
        os.rename(old_path, new_path)
        return {"message": f"File renamed from {old_name} to {new_name} successfully"}
    except IOError:
        raise HTTPException(status_code=403, detail="Path traversal attempt")


@app.post("/api/generate-temp-token/{filename}")
async def generate_temp_token(filename: str, folder: Optional[str] = None, _=Depends(auth_handler.auth_wrapper)):
    try:
        check_path = get_file_path("", folder)
        if filename not in os.listdir(check_path):
            raise HTTPException(status_code=404, detail="File not found")
        temp_token = auth_handler.encode_temp_token(filename)
        return {"temp_token": temp_token}
    except IOError:
        raise HTTPException(status_code=403, detail="Path traversal attempt")


@app.get("/public/{filename}")
async def get_public_file(filename: str, t: str, folder: Optional[str] = None):
    try:
        payload = auth_handler.decode_temp_token(t)
        if payload.get("filename") != filename:
            raise HTTPException(status_code=400, detail="Invalid token for this file")
    except HTTPException:
        return RedirectResponse(url="https://www.youtube.com/watch?v=dQw4w9WgXcQ&msg=token+has+expired")

    try:
        file_path = get_file_path(filename, folder)
        if os.path.exists(file_path) and not os.path.isdir(file_path):
            return FileResponse(file_path)
    except IOError:
        raise HTTPException(status_code=403, detail="Path traversal attempt")

    raise HTTPException(status_code=404, detail="File not found")


@app.get("/private/{filename}")
async def get_private_file(filename: str, t: str, folder: Optional[str] = None):
    try:
        auth_handler.decode_token(t)
        file_path = get_file_path(filename, folder)
        if os.path.exists(file_path):
            return FileResponse(file_path)
    except IOError:
        raise HTTPException(status_code=403, detail="Path traversal attempt")
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid or expired token")
    raise HTTPException(status_code=404, detail="File not found")


@app.get("/api/preview/{filename}")
async def get_file_preview(filename: str, folder: Optional[str] = None, _=Depends(auth_handler.auth_wrapper)):
    try:
        file_path = get_file_path(filename, folder)
    except IOError:
        raise HTTPException(status_code=403, detail="Path traversal attempt")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")


    _, file_extension = os.path.splitext(filename)
    if file_extension.lower() not in ['.txt', '.md', '.py', '.js', '.html', '.css', '.json', '.sh']:
        raise HTTPException(status_code=400, detail="File type not supported for preview")

    try:
        with open(file_path, 'r') as file:
            lines = file.readlines()
            preview_lines = lines[:15]
            return {"preview": preview_lines}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading preview. {e=}")


@app.get("/api/make_short")
async def make_short(url: str, _=Depends(auth_handler.auth_wrapper)):
    short_url = generate_short_url()
    save_short_url(short_url, url)
    return {"short_url": f"/short/{short_url}"}


@app.get("/short/{short_url}")
async def redirect_short_url(short_url: str):
    try:
        with open('short_urls.json', 'r') as f:
            short_urls = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Short URL not found")

    actual_url = short_urls.get(f"/short/{short_url}")
    if actual_url:
        return RedirectResponse(url=actual_url)
    else:
        raise HTTPException(status_code=404, detail="Short URL not found")


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(request=request, name="login.html")


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse(request=request, name="dashboard.html")

@app.exception_handler(404)
async def custom_404_handler(request, __):
    return templates.TemplateResponse("404.html", {"request": request})
