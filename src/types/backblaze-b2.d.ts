declare module 'backblaze-b2' {
  interface B2Config {
    applicationKeyId: string;
    applicationKey: string;
  }

  interface UploadUrlResponse {
    data: {
      uploadUrl: string;
      authorizationToken: string;
    };
  }

  interface UploadFileParams {
    uploadUrl: string;
    uploadAuthToken: string;
    fileName: string;
    data: Buffer;
    mime: string;
    info?: Record<string, string>;
  }

  interface UploadFileResponse {
    data: {
      fileId: string;
      fileName: string;
    };
  }

  interface DownloadAuthResponse {
    data: {
      authorizationToken: string;
    };
  }

  interface FileInfoResponse {
    data: any;
  }

  interface ListFilesResponse {
    data: {
      files?: any[];
    };
  }

  class B2 {
    downloadUrl: string;
    
    constructor(config: B2Config);
    authorize(): Promise<any>;
    getUploadUrl(params: { bucketId: string }): Promise<UploadUrlResponse>;
    uploadFile(params: UploadFileParams): Promise<UploadFileResponse>;
    getDownloadAuthorization(params: {
      bucketId: string;
      fileNamePrefix: string;
      validDurationInSeconds: number;
    }): Promise<DownloadAuthResponse>;
    deleteFileVersion(params: { fileId: string; fileName: string }): Promise<any>;
    getFileInfo(params: { fileId: string }): Promise<FileInfoResponse>;
    listFileNames(params: {
      bucketId: string;
      prefix: string;
      maxFileCount: number;
    }): Promise<ListFilesResponse>;
  }

  export = B2;
}