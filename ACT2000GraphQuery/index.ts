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
function getClient(accessToken, version = "beta") {
    return MicrosoftGraph.Client.init({
        defaultVersion: version,
        authProvider: (done) => {
            done(null, accessToken);
        },
    });
}

// Query Graph API
function queryGraphAPI(client, apiUrl, filter = "") {
    return new Promise((resolve) => {
        try {
            client
                .api(apiUrl)
                .filter(filter)
                .get((err, result) => {
                    if (err) {
                        resolve({ ok: false, error: err });
                    } else {
                        resolve({ ok: true, result: result });
                    }
                });
        } catch (error) {
            resolve({ ok: false, error: error });
        }
    });
}

const activityFunction: AzureFunction = async function (context: Context, msGraphResource): Promise<string> {
    let response = null;

    if(msGraphResource.accessToken){
        let client = await getClient(msGraphResource.accessToken);

        if (msGraphResource.graphResourceUrl) {
            console.log("query resources " + msGraphResource.graphResourceUrl )
            response = await queryGraphAPI(client, msGraphResource.graphResourceUrl);
        } else {
            console.log("No API Url defined")
        }
    } else {
        console.log("No AccessToken defined")
    }
    // return result
    console.log(response);
    return response;
};

export default activityFunction;
