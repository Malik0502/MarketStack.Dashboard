import { BaseResponse } from "./baseResponse";

export class DataResponse<T> extends BaseResponse{
    data?: T;

    static createSuccessResponse<T>(data: T, title: string, message: string): DataResponse<T> {
        return {
            data,
            title,
            message,
            success: true
        };
    }

    static createErrorResponse<T>( title: string, message: string, errorCode: number): DataResponse<T> {
        return {
            title,
            message,
            errorCode,
            success: false
        };
    }
}