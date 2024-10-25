"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.KindeSDKError = exports.KindeSDKErrorCode = void 0;
var KindeSDKErrorCode;
(function (KindeSDKErrorCode) {
    KindeSDKErrorCode["INVALID_TOKEN_MEMORY_COMMIT"] = "INVALID_TOKEN_MEMORY_COMMIT";
    KindeSDKErrorCode["FAILED_TOKENS_REFRESH_ATTEMPT"] = "FAILED_TOKENS_REFRESH_ATTEMPT";
})(KindeSDKErrorCode = exports.KindeSDKErrorCode || (exports.KindeSDKErrorCode = {}));
var KindeSDKError = /** @class */ (function (_super) {
    __extends(KindeSDKError, _super);
    function KindeSDKError(errorCode, message) {
        var _this = _super.call(this, message) || this;
        _this.errorCode = errorCode;
        _this.name = 'KindeSDKError';
        Object.setPrototypeOf(_this, KindeSDKError.prototype);
        return _this;
    }
    return KindeSDKError;
}(Error));
exports.KindeSDKError = KindeSDKError;
