const API_BASE = "http://127.0.0.1:8000";


// =============================
// 🔐 Check Login
// =============================
const token = localStorage.getItem("token");


if (!token) {
    alert("Please login first!");
    window.location.href = "login.html";
}


// Store all files globally for filtering
let allFiles = [];


// =============================
// 🔄 Switch Sections
// =============================
function showSection(id) {
    document.querySelectorAll(".section").forEach(sec => {
        sec.classList.remove("active");
    });


    document.getElementById(id).classList.add("active");
}


// =============================
// 📂 Upload File
// =============================
async function uploadFile() {


    const fileInput = document.getElementById("fileInput");


    if (!fileInput.files[0]) {
        showModal("Warning", "Please select a file.");
        return;
    }


    const formData = new FormData();
    formData.append("file", fileInput.files[0]);


    try {
        const response = await fetch(`${API_BASE}/upload/`, {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token
            },
            body: formData
        });


        const data = await response.json();


        if (response.ok) {


            // ✅ DEDUPLICATION CHECK
            if (data.deduplicated === true) {

                showModal(
                   "Duplicate Detected",
                   data.message
                );

            } else {

              showModal(
                   "Upload Successful!",
                   "Your file has been uploaded securely."
                );

            }  


        } else {
            showModal(
                "Upload Failed",
                data.detail || data.error || "Something went wrong."
            );
        }


        fileInput.value = "";
        fetchFiles();


    } catch (error) {
        showModal(
            "Server Error",
            "Unable to upload file. Please try again."
        );
        console.error(error);
    }
}


// =============================
// 📋 Fetch Files
// =============================
async function fetchFiles() {


    try {
        const response = await fetch(`${API_BASE}/files/`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });


        if (!response.ok) {
            throw new Error("Unauthorized");
        }


        const files = await response.json();


        allFiles = files;
        renderFiles(files);


    } catch (error) {
        showModal("Session Expired", "Please login again.");
        logout();
    }
}


// =============================
// 🖥 Render Files
// =============================
function renderFiles(files) {


    const tbody = document.getElementById("fileTableBody");
    tbody.innerHTML = "";


    let totalSize = 0;


    files.forEach(file => {


        totalSize += file.file_size || 0;


        tbody.innerHTML += `
            <tr>
                <td>${file.original_filename}</td>
                <td>${(file.file_size / (1024*1024)).toFixed(2)} MB</td>
                <td>
                    <button onclick="downloadFile('${file._id}')">Download</button>
                </td>
                <td>
                    <button onclick="showConfirmModal('${file._id}')">Delete</button>
                </td>
            </tr>
        `;
    });


    updateStorage(totalSize);
}


// =============================
// 🔎 File Type Filter
// =============================
document.addEventListener("DOMContentLoaded", function() {


    const filter = document.getElementById("fileFilter");


    if (filter) {
        filter.addEventListener("change", function() {


            const selectedType = this.value;


            if (selectedType === "all") {
                renderFiles(allFiles);
                return;
            }


            const filtered = allFiles.filter(file =>
                file.original_filename.toLowerCase().endsWith("." + selectedType)
            );


            renderFiles(filtered);
        });
    }
});


// =============================
// 🗑 Delete File
// =============================



// =============================
// ⬇ Download File
// =============================
async function downloadFile(fileId) {


    try {
        const response = await fetch(`${API_BASE}/download/${fileId}`, {
            headers: {
                "Authorization": "Bearer " + token
            }
        });


        if (!response.ok) {
            throw new Error("Download failed");
        }


        const blob = await response.blob();


        let fileName = "downloaded_file";


        const disposition = response.headers.get("content-disposition");


        if (disposition && disposition.includes("filename=")) {
            fileName = disposition.split("filename=")[1].replace(/"/g, '');
        }


        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");


        a.href = url;
        a.download = fileName;


        document.body.appendChild(a);
        a.click();
        a.remove();


        window.URL.revokeObjectURL(url);


    } catch (error) {
        console.error(error);
        showModal("Download Failed", "Something went wrong.");
    }
}


// =============================
// 💾 Storage Usage
// =============================
function updateStorage(totalBytes) {


    const maxStorage = 100 * 1024 * 1024; // 100MB
    const percent = (totalBytes / maxStorage) * 100;


    document.getElementById("storageProgress").style.width = percent + "%";


    document.getElementById("storageText").innerText =
        (totalBytes / (1024*1024)).toFixed(2) + " MB / 100 MB";
}


// =============================
// 🚪 Logout
// =============================
function logout() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}


// =============================
// 🚀 Load Files on Page Open
// =============================
window.onload = fetchFiles;


function showModal(title, message) {
    const modal = document.getElementById("successModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalMessage = document.getElementById("modalMessage");


    modalTitle.textContent = title;
    modalMessage.textContent = message;


    modal.style.display = "flex";
}


function closeModal() {
    document.getElementById("successModal").style.display = "none";
}


let fileToDelete = null;


function showConfirmModal(fileId) {
    fileToDelete = fileId;
    document.getElementById("confirmModal").style.display = "flex";
}


function closeConfirm() {
    document.getElementById("confirmModal").style.display = "none";
    fileToDelete = null;
}


async function confirmDelete() {
    if (!fileToDelete) return;


    try {
        const response = await fetch(`${API_BASE}/delete/${fileToDelete}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });


        const data = await response.json();


        if (response.ok) {
            showModal("Deleted Successfully!", "Your file has been removed.");
        } else {
            showModal("Delete Failed", data.error || "Something went wrong.");
        }


        fetchFiles();
        closeConfirm();


    } catch (error) {
        showModal("Delete Failed", "Something went wrong.");
        closeConfirm();
    }
}
