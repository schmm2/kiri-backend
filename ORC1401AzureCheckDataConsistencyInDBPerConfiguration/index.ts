/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 * 
 * Before running this sample, please:
 * - create a Durable activity function (default name is "Hello")
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your 
 *    function app in Kudu
 */

import * as df from "durable-functions"

const orchestrator = df.orchestrator(function* (context) {
    const queryParameters: any = context.df.getInput();
    let configuration = queryParameters.configuration;
    let accessToken = queryParameters.accessToken;

    // get msGraphresource per configuration
    let msGraphResource = yield context.df.callActivity("ACT1060ConfigurationGetMsGraphResource", configuration._id);
    let url = msGraphResource.resource + "/" + configuration.graphId;

    let graphQuery = {
        graphResourceUrl: url,
        accessToken: accessToken
    }
    let configurationResponse = yield context.df.callActivity("ACT2001MsGraphGet", graphQuery);

    if (!configurationResponse.ok) {
        if (!context.df.isReplaying) context.log("unable to find " + configuration._id);
        return yield context.df.callActivity("ACT1063ConfigurationDelete", configuration._id);
    }
    return
});

export default orchestrator;
