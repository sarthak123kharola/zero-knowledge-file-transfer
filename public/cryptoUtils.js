function encryptChunk(arrayBuffer, password) {
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
  const encrypted = CryptoJS.AES.encrypt(wordArray, password).toString();
  return encrypted;
}

export { encryptChunk };
