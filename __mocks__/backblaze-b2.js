module.exports = jest.fn().mockImplementation(() => ({
  authorize: jest.fn(),
  getUploadUrl: jest.fn(),
  uploadFile: jest.fn(),
  getDownloadAuthorization: jest.fn(),
  deleteFileVersion: jest.fn(),
  getFileInfo: jest.fn(),
  listFileNames: jest.fn(),
  downloadUrl: 'https://f000.backblazeb2.com'
}));