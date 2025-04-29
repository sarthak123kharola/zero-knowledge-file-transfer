async function decryptFile() {
    const filename = document.getElementById("downloadFileName").value;
    const password = document.getElementById("decryptPassword").value;
    const status = document.getElementById("decryptStatus");

    if (!filename || !password) {
        status.textContent = "❗Please provide file name and password.";
        return;
    }

    status.textContent = "🔄 Decrypting... Please wait...";
    try {
        let i = 0;
        const combinedChunks = [];

        while (true) {
            const partFileName = getFileName(filename, i);

            const res = await fetch(`/download/${partFileName}`);
            if (!res.ok) {
                if (i === 0) {
                    throw new Error("❗ No file parts found on server.");
                }
                break; // no more parts
            }

            const encryptedBase64 = await res.text();

            const decrypted = CryptoJS.AES.decrypt(encryptedBase64, password);
            if (!decrypted.sigBytes || decrypted.sigBytes <= 0) {
                throw new Error("❗ Incorrect password or corrupted part.");
            }

            const byteArray = new Uint8Array(decrypted.sigBytes);
            for (let j = 0; j < decrypted.sigBytes; j++) {
                byteArray[j] = (decrypted.words[Math.floor(j / 4)] >>> (24 - (j % 4) * 8)) & 0xFF;
            }

            combinedChunks.push(byteArray);
            i++;
        }

        if (combinedChunks.length === 0) {
            throw new Error("❗ No parts downloaded.");
        }

        // Combine
        const totalLength = combinedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of combinedChunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
        }

        const blob = new Blob([combined]);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        status.textContent = `✅ File ${filename} downloaded successfully.`;
    } catch (err) {
        console.error(err);
        status.textContent = err.message || "❗ Error during decryption or download.";
    }
}

function getFileName(filename, i) {
    let temp = "";
    let k = 0;
    while (k < filename.length) {
        if (filename[k] === '.') {
            temp += `.part${i}.`;
        } else {
            temp += filename[k];
        }
        k++;
    }
    return temp;
}