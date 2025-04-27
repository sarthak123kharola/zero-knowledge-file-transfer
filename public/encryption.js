// encryption.js

import { encryptChunk } from './cryptoUtils.js';

async function encryptAndUpload() {
    const fileInput = document.getElementById("fileInput");
    const passwordInput = document.getElementById("password");
    const status = document.getElementById("status");

    const file = fileInput.files[0];
    const password = passwordInput.value;

    if (!file || !password) {
        status.textContent = "Please select a file and enter a password.";
        return;
    }

    await fetch("/mapping", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            fileName: file.name,    // <-- correct file name
            mimeType: file.type     // <-- correct MIME type
        }),
    });

    const chunkSize = 10 * 1024 * 1024; // 10MB
    let offset = 0;
    let chunkIndex = 0;

    status.textContent = "🔄 Encrypting and uploading...";

    try {
        while (offset < file.size) {
            document.getElementById("progressBar").value= (offset/file.size) * 100;
            const end = Math.min(offset + chunkSize, file.size);
            const chunk = file.slice(offset, end);

            const arrayBuffer = await readFileChunk(chunk);
            const encrypted = encryptChunk(arrayBuffer, password);

            // Create Blob for the encrypted chunk
            let extension = getMimeTypeFromFileName(file.name);
            const blob = new Blob([encrypted], { type: `${extension}` });
            const formData = new FormData();
            let name= getName(file.name);
            formData.append("chunk", blob, `${name}.part${chunkIndex}.${extension}`);


            // Upload the encrypted chunk

            const response = await fetch(`/upload-chunk`, {
                method: "POST",
                body: formData, // only formData here
            });


            if (!response.ok) {
                throw new Error(`Chunk ${chunkIndex} upload failed.`);
            }

            offset = end;
            chunkIndex++;
        }
        document.getElementById("progressBar").value= 100;
        status.textContent = "✅ All chunks encrypted and uploaded!";
        
    } catch (err) {
        console.error(err);
        status.textContent = "❌ Error occurred during encryption or upload.";
    }
}

// Helper: Read a chunk as ArrayBuffer
function readFileChunk(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(blob);
    });
}

// Expose the function
export { encryptAndUpload };

function getMimeTypeFromFileName(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    return extension || 'application/octet-stream'; // fallback if unknown
}

function getName(name){
    let temp="";
    let i=0;
    while(name[i]!=='.') temp+= name[i++];
    return temp;
}