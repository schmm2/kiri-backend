const createErrorResponse = (message, context, functionName, payload = ""): any => {
    if (context.df) {
        if (!context.df.isReplaying) context.log.error(functionName, message);
    } else {
        context.log.error(functionName, message);
    }

    return {
        status: 400,
        body: {
            "ok": false,
            "message": message,
            "payload": payload
        }
    }
}

export { createErrorResponse }