/*
    This function takes in a graph object
    Query the resources $resourceUrl/$id to resolve all data containing in object
*/

import * as df from "durable-functions"
let queryParameters: any;

const orchestrator = df.orchestrator(function* (context) {
    let outputs: any = "";
    queryParameters = context.df.getInput();

    let graphResourceUrl = queryParameters.graphResourceUrl;
    let graphValue = queryParameters.graphValue;

    let graphQueryResource = {
        graphResourceUrl: graphResourceUrl + "/" + graphValue.id,
        accessToken: queryParameters.accessToken
    }

    let response = yield context.df.callActivity("ACT2000MsGraphQuery", graphQueryResource);

    if (response && response.ok && response.result) {
        context.log("ORC1200MsGraphQueryResolveById", "found data for " + graphValue.id)
        outputs = response.result
    }
    return outputs;
});

export default orchestrator;
