const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve frontend files from public/
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Set up Multer
const upload = multer({ dest: path.join(__dirname, 'tempUploads') });

// Endpoint to handle encrypted chunk uploads
app.post('/upload-chunk', upload.single('chunk'), (req, res) => {
    if (!req.file) {
        return res.status(400).send("No chunk received.");
    }

    const tempPath = req.file.path;
    const targetPath = path.join(uploadsDir, req.file.originalname);
    fs.rename(tempPath, targetPath, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Chunk saving failed.");
        }
        res.send("Chunk uploaded successfully.");
    });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on http://localhost:${PORT}`);
});


app.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found");
  }

  res.sendFile(filePath);
});

// Route to save filename and mimetype
app.post('/mapping', (req, res) => {
    const { fileName, mimeType } = req.body;

    if (!fileName || !mimeType) {
        return res.status(400).send('Missing fileName or mimeType.');
    }

    const manifestPath = path.join(__dirname, 'uploads', 'manifest.txt');
    const entry = `${fileName} : ${mimeType}\n`;

    fs.appendFile(manifestPath, entry, (err) => {
        if (err) {
            console.error('Error writing to manifest.txt', err);
            return res.status(500).send('Server error.');
        }
        res.send('File info saved successfully.');
    });
});