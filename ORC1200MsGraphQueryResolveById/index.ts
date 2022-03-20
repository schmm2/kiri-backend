/*
    This function takes in a graph object
    Query the resources $resourceUrl/$id to resolve all data containing in object
*/

import * as df from "durable-functions"
let queryParameters: any;
import { createErrorResponse } from "../utils/createErrorResponse"
let functionName = "ORC1200MsGraphQueryResolveById"

const orchestrator = df.orchestrator(function* (context) {
    let outputs: any = "";
    queryParameters = context.df.getInput();

    let graphResourceUrl = queryParameters.graphResourceUrl;
    let graphValue = queryParameters.payload;

    if (graphValue && graphValue.id) {
        let graphQueryResource = {
            graphResourceUrl: graphResourceUrl + "/" + graphValue.id,
            accessToken: queryParameters.accessToken
        }
        
        let response = yield context.df.callActivity("ACT2001MsGraphGet", graphQueryResource);

        if (response.ok && response.data) {
            context.log("ORC1200MsGraphQueryResolveById", "found data for " + graphValue.id)
            outputs = response.data
        }else{
            createErrorResponse("unable to query data " + graphQueryResource.graphResourceUrl, context, functionName)
            throw new Error("unable to query data " + graphQueryResource.graphResourceUrl)
        }
    }
    return outputs;
});

export default orchestrator;
