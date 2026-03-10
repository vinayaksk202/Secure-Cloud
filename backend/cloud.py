import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# ✅ Correct: pass VARIABLE NAME, not value
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

print("Supabase URL:", SUPABASE_URL)

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL not loaded from .env")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET_NAME = "securecloud-files"


def upload_to_cloud(file_data, filename):
    supabase.storage.from_(BUCKET_NAME).upload(
        filename,
        file_data
    )

    file_url = supabase.storage.from_(BUCKET_NAME).get_public_url(filename)

    return file_url
def delete_from_cloud(filename):
    supabase.storage.from_(BUCKET_NAME).remove([filename])
def download_from_cloud(filename):
    response = supabase.storage.from_(BUCKET_NAME).download(filename)
    return response


