/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */

import { AzureFunction, Context } from "@azure/functions"
var MicrosoftGraph = require("@microsoft/microsoft-graph-client");

// Utils
require("isomorphic-fetch");

// Create Graph Client to AD
function getClient(accessToken) {
    return MicrosoftGraph.Client.init({
        defaultVersion: "beta",
        authProvider: (done) => {
            done(null, accessToken);
        },
    });
}

// Patch Graph API
async function postGraphAPI(client, apiUrl, dataObject) {
    try {
        let result = await client.api(apiUrl).post(dataObject);
        return { ok: true, message: result };
    } catch (error) {
        return { ok: false, message: error };
    }
}

const activityFunction: AzureFunction = async function (context: Context, queryParameters): Promise<string> {
    console.log("ACT2003MsGraphhPost", "start script");

    let accessToken = queryParameters.accessToken;
    let msGraphApiUrl = queryParameters.msGraphApiUrl;
    let dataObject = queryParameters.dataObject

    let client = await getClient(accessToken);

    // patch resource via graph api
    let response: any = await postGraphAPI(client, msGraphApiUrl, dataObject);
    //console.log("ACT2003MsGraphhPost", response);

    return response;
};

export default activityFunction;
