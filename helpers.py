import os
import json
import random
import string
from typing import Optional

from config import UPLOAD_DIRECTORY


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


def get_file_path(filename: str, folder: Optional[str] = None) -> str:
    path = os.path.join(UPLOAD_DIRECTORY, folder, filename) if folder else os.path.join(UPLOAD_DIRECTORY, filename)
    normalized_path = os.path.normpath(path)

    if not normalized_path.startswith(UPLOAD_DIRECTORY):
        raise IOError()

    return normalized_path
