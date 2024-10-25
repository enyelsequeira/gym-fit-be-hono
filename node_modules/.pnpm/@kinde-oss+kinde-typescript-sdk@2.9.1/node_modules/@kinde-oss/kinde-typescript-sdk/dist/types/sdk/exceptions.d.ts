export declare enum KindeSDKErrorCode {
    INVALID_TOKEN_MEMORY_COMMIT = "INVALID_TOKEN_MEMORY_COMMIT",
    FAILED_TOKENS_REFRESH_ATTEMPT = "FAILED_TOKENS_REFRESH_ATTEMPT"
}
export declare class KindeSDKError extends Error {
    errorCode: KindeSDKErrorCode;
    constructor(errorCode: KindeSDKErrorCode, message: string);
}
