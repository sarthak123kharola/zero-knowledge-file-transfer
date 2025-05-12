const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Multer setup to store temporarily in tempUploads/
const upload = multer({ dest: path.join(__dirname, 'tempUploads') });

// Google Drive Setup
const KEYFILEPATH = path.join(__dirname, 'service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const driveService = google.drive({ version: 'v3', auth });

// Upload chunk to Google Drive
app.post('/upload-chunk', upload.single('chunk'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send("No chunk received.");
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const mimeType = req.file.mimetype;

    try {
        const fileMetadata = {
            name: fileName,
            parents: ['1Dw0YpF1jK8EGalCiFzlq55XpGZH_Q83P'],
            // parents: ['YOUR_FOLDER_ID'], // Uncomment and replace if you want to upload into a specific folder
        };

        const media = {
            mimeType,
            body: fs.createReadStream(filePath),
        };

        const response = await driveService.files.create({
            requestBody: fileMetadata,
            media,
            fields: 'id',
        });

        fs.unlinkSync(filePath); // Clean up temporary file

        res.send(`✅ Uploaded to Google Drive with ID: ${response.data.id}`);
    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).send("Google Drive upload failed.");
    }
});

// Save filename and mimetype to manifest.txt (locally)
app.post('/mapping', (req, res) => {
    const { fileName, mimeType } = req.body;

    if (!fileName || !mimeType) {
        return res.status(400).send('Missing fileName or mimeType.');
    }

    const manifestPath = path.join(__dirname, 'manifest.txt');
    const entry = `${fileName} : ${mimeType}\n`;

    fs.appendFile(manifestPath, entry, (err) => {
        if (err) {
            console.error('Error writing to manifest.txt', err);
            return res.status(500).send('Server error.');
        }
        res.send('File info saved successfully.');
    });
});

// Server startup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on http://localhost:${PORT}`);
});


app.get('/download/:filename', async (req, res) => {
    const filename = decodeURIComponent(req.params.filename); // in case of URL encoding
    const FOLDER_ID = '1Dw0YpF1jK8EGalCiFzlq55XpGZH_Q83P';

    try {
        const query = `name = '${filename}' and '${FOLDER_ID}' in parents and trashed = false`;
        const response = await driveService.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (!response.data.files || response.data.files.length === 0) {
            console.warn(`❗ File "${filename}" not found in folder.`);
            return res.status(404).send("File not found in Drive.");
        }

        const file = response.data.files[0];

        const driveResponse = await driveService.files.get(
            { fileId: file.id, alt: 'media' },
            { responseType: 'stream' }
        );

        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
        driveResponse.data.pipe(res);
    } catch (err) {
        console.error('❌ Error downloading file from Drive:', err);
        res.status(500).send("Download failed.");
    }
});
