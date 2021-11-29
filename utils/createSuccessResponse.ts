const createSuccessResponse = (message = "", context, functionName): any => {
    if (context.df) {
        if (!context.df.isReplaying) context.log(functionName, message);
    } else {
        context.log(functionName, message);
    }

    return {
        "ok": true,
        "state": 'SUCCESS',
        "message": message
    }
}

export { createSuccessResponse }