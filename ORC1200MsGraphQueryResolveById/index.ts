/*
    This function takes in a graph object
    Query the resources $resourceUrl/$id to resolve all data containing in object
*/

import * as df from "durable-functions"
let queryParameters: any;
let functionName = "ORC1200MsGraphQueryResolveById"

const orchestrator = df.orchestrator(function* (context) {
    let outputs: any = "";
    queryParameters = context.df.getInput();

    let graphResourceUrl = queryParameters.graphResourceUrl;
    let msGraphResource = queryParameters.msGraphResource;
    let graphValue = queryParameters.payload;

    if (graphValue && graphValue.id) {
        let graphQueryResource = {
            // expand graphItem as much as possible
            graphResourceUrl: graphResourceUrl + "/" + graphValue.id,
            accessToken: queryParameters.accessToken
        }

        // add expand 
        if (msGraphResource && msGraphResource.expandAttributes) {
            let expandString = "?$expand=" + msGraphResource.expandAttributes.join()
            graphQueryResource.graphResourceUrl = graphQueryResource.graphResourceUrl + expandString
        }

        if (!context.df.isReplaying) context.log(functionName, "url: " +  graphQueryResource.graphResourceUrl)

        // retry options
        const firstRetryIntervalInMilliseconds = 5000;
        const maxNumberOfAttempts = 3;
        const retryOptions = new df.RetryOptions(firstRetryIntervalInMilliseconds, maxNumberOfAttempts);
        let response = null

        try {
            response = yield context.df.callActivityWithRetry("ACT2001MsGraphGet", retryOptions, graphQueryResource);
            if (response.ok && response.data) {
                if (!context.df.isReplaying) context.log(functionName, "found data for " + graphValue.id)
                outputs = response.data
            }
        } catch (err) {
            throw new Error("unable to query data " + graphQueryResource.graphResourceUrl)
        }
    }
    return outputs;
});

export default orchestrator;
