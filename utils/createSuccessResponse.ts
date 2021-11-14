const createSuccessResponse = (message, context, functionName, payload = ""): any => {
    if (context.df) {
        if (!context.df.isReplaying) context.log(functionName, message);
    } else {
        context.log(functionName, message);
    }

    return {
        "ok": false,
        "payload": message
    }
}

export { createSuccessResponse }