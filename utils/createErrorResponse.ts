const createErrorResponse = (message, context, functionName, payload = ""): any => {
    if (context.df) {
        if (!context.df.isReplaying) context.log.error(functionName, message);
    } else {
        context.log.error(functionName, message);
    }

    return {
        "ok": false,
        "message": message
    }
}

export { createErrorResponse }