from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from bson import ObjectId
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from io import BytesIO
from image_dedup import get_image_hash, get_image_resolution
import uuid
import mimetypes
import re
security = HTTPBearer()

# Database
from database import files_collection, users_collection

# Encryption
from encryption import sha256_hash, hybrid_encrypt, hybrid_decrypt

# Cloud
from cloud import upload_to_cloud, delete_from_cloud, download_from_cloud

# Auth
from auth import hash_password, verify_password, create_access_token, verify_token

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def is_strong_password(password: str):
    pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$'
    return re.match(pattern, password)

# ========================= AUTH HELPER =========================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials  # Extract token
    print("Token received:", token) 

    payload = verify_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload["username"]


# ========================= REGISTER =========================

@app.post("/register/")
def register(username: str, password: str):

    existing = users_collection.find_one({"username": username})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # 🔒 Password validation
    if not is_strong_password(password):
       raise HTTPException(
        status_code=400,
        detail="Password must be at least 8 characters long and include uppercase, lowercase, number and special character."
    )


    hashed = hash_password(password)

    users_collection.insert_one({
        "username": username,
        "password": hashed
    })

    return {"message": "User registered successfully"}

# ========================= LOGIN =========================

@app.post("/login/")
def login(username: str, password: str):

    user = users_collection.find_one({"username": username})

    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"username": username})

    return {"access_token": token}

# ========================= UPLOAD =========================

@app.post("/upload/")
async def upload_file(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):

    data = await file.read()
    file_size = len(data)

    file_hash = sha256_hash(data)

    file_extension = file.filename.split(".")[-1].lower()

    image_types = ["jpg", "jpeg", "png"]

    phash = None
    resolution = None
    existing = None


    # IMAGE DEDUPLICATION
    if file_extension in image_types:

        phash = get_image_hash(data)
        resolution = get_image_resolution(data)

        existing = files_collection.find_one({
           "phash": phash,
           "user": current_user
        })

        if existing:

           return {
              "message": "Duplicate image detected. Upload cancelled.",
               "deduplicated": True
            }


    # NORMAL FILE DEDUPLICATION
    else:

        existing = files_collection.find_one({
          "file_hash": file_hash,
          "user": current_user
        })

        if existing:

            return {
              "message": "Duplicate file detected. Upload cancelled.",
              "deduplicated": True
            }  

    

    encrypted_data, encrypted_key = hybrid_encrypt(data)

    unique_filename = f"{uuid.uuid4()}_{file.filename}"

    cloud_url = upload_to_cloud(encrypted_data, unique_filename)
    file_extension = file.filename.split(".")[-1].lower()
    metadata = {
        "original_filename": file.filename,
        "cloud_filename": unique_filename,
        "file_hash": file_hash,
        "phash": phash,
        "resolution": resolution,
        "cloud_url": cloud_url,
        "encrypted_key": encrypted_key.hex(),
        "file_size": file_size,
        "file_type": file_extension,
        "user": current_user
    }

    files_collection.insert_one(metadata)

    return {
    "message": "File uploaded successfully!",
    "deduplicated": False
    }


# ========================= LIST FILES =========================

@app.get("/files/")
def list_files(current_user: str = Depends(get_current_user)):

    files = list(files_collection.find({"user": current_user}))

    for file in files:
        file["_id"] = str(file["_id"])

    return files

# ========================= DELETE =========================

@app.delete("/delete/{file_id}")
def delete_file(
    file_id: str,
    current_user: str = Depends(get_current_user)
):

    file_doc = files_collection.find_one({
        "_id": ObjectId(file_id),
        "user": current_user
    })

    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    delete_from_cloud(file_doc["cloud_filename"])
    files_collection.delete_one({"_id": ObjectId(file_id)})

    return {"message": "File deleted successfully"}

# ========================= DOWNLOAD =========================

@app.get("/download/{file_id}")
def download_file(file_id: str, current_user: str = Depends(get_current_user)):

    file_doc = files_collection.find_one({"_id": ObjectId(file_id)})

    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    encrypted_data = download_from_cloud(file_doc["cloud_filename"])

    decrypted_data = hybrid_decrypt(
        encrypted_data,
        file_doc["encrypted_key"]
    )

    filename = file_doc["original_filename"]

    # 🔥 Detect correct file type automatically
    mime_type, _ = mimetypes.guess_type(filename)

    if mime_type is None:
        mime_type = "application/octet-stream"

    return StreamingResponse(
        BytesIO(decrypted_data),
        media_type=mime_type,   # ✅ correct MIME
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )