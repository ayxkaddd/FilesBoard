from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, status, Request, Form
from fastapi.responses import HTMLResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os
import shutil
import json
import random
import string

from auth import AuthHandler
from models import AuthDetails
from config import UPLOAD_DIRECTORY, users

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

auth_handler = AuthHandler()


def generate_short_url():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=6))


def save_short_url(short_url, actual_url):
    try:
        with open('short_urls.json', 'r') as f:
            short_urls = json.load(f)
    except FileNotFoundError:
        short_urls = {}

    short_urls[f"/short/{short_url}"] = actual_url

    with open('short_urls.json', 'w') as f:
        json.dump(short_urls, f)


@app.post("/api/login")
async def login(auth_details: AuthDetails):
    user = users.get(auth_details.username)
    print(user)
    if (user is None) or (not auth_handler.verify_password(auth_details.password, user["password"])):
        raise HTTPException(status_code=401, detail='Invalid username and/or password')
    token = auth_handler.encode_token(auth_details.username)
    return {"token": token}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), _=Depends(auth_handler.auth_wrapper)):
    file_location = os.path.join(UPLOAD_DIRECTORY, file.filename)
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    return {"filename": file.filename}


@app.get("/api/files")
async def list_files(_=Depends(auth_handler.auth_wrapper)):
    files = os.listdir(UPLOAD_DIRECTORY)
    return {"files": files}


@app.delete("/api/files/{filename}")
async def delete_file(filename: str, _=Depends(auth_handler.auth_wrapper)):
    file_path = os.path.join(UPLOAD_DIRECTORY, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        return {"message": f"File {filename} deleted successfully"}
    raise HTTPException(status_code=404, detail="File not found")


@app.post("/api/generate-temp-token/{filename}")
async def generate_temp_token(filename: str, _=Depends(auth_handler.auth_wrapper)):
    if filename not in os.listdir(UPLOAD_DIRECTORY):
        raise HTTPException(status_code=404, detail="File not found")
    temp_token = auth_handler.encode_temp_token(filename)
    return {"temp_token": temp_token}


@app.get("/public/{filename}")
async def get_public_file(filename: str, t: str):
    try:
        payload = auth_handler.decode_temp_token(t)
        if payload.get("filename") != filename:
            raise HTTPException(status_code=400, detail="Invalid token for this file")
    except HTTPException:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    file_path = os.path.join(UPLOAD_DIRECTORY, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)

    raise HTTPException(status_code=404, detail="File not found")


@app.get("/private/{filename}")
async def get_private_file(filename: str, t: str):
    file_path = os.path.join(UPLOAD_DIRECTORY, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)

    raise HTTPException(status_code=404, detail="File not found")


@app.get("/api/preview/{filename}")
async def get_file_preview(filename: str, _=Depends(auth_handler.auth_wrapper)):
    file_path = os.path.join(UPLOAD_DIRECTORY, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    _, file_extension = os.path.splitext(filename)
    if file_extension.lower() not in ['.txt', '.md', '.py', '.js', '.html', '.css']:
        raise HTTPException(status_code=400, detail="File type not supported for preview")

    with open(file_path, 'r') as file:
        lines = file.readlines()
        preview_lines = lines[:15]
        return {"preview": preview_lines}


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


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(request=request, name="login.html")


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    return templates.TemplateResponse(request=request, name="dashboard.html")
