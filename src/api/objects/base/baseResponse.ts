export class BaseResponse{
    title: string | null = "";
    message: string = "";
    success: boolean = false;
    errorCode?: number;

    static createSuccessMessage(title: string, message: string): BaseResponse {
        return {
            title,
            message,
            success: true
        };
    }

    static createErrorMessage(title: string, message: string, errorCode: number): BaseResponse {
        return {
            title,
            message,
            errorCode,
            success: false
        };
    }
}