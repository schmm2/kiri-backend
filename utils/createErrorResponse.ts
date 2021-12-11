const createErrorResponse = (message = "", context, functionName): any => {
    if (context.df) {
        if (!context.df.isReplaying) context.log.error(functionName, message);
    } else {
        context.log.error(functionName, message);
    }

    return {
        "ok": false,
        "state": 'ERROR',
        "message": message
    }
}

export { createErrorResponse }