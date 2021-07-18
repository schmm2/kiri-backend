﻿/*
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

async function test(context, definitionValue, graphResourceUrl, graphItemId, queryParameters) {


}

const orchestrator = df.orchestrator(function* (context) {
    context.log("ORC1002AzureDataCollectHandleGroupPolicy", "Start GPO Handler");

    let queryParameters: any = context.df.getInput();
    let configurationListGraph = queryParameters.graphValue;
    let graphResourceUrl = queryParameters.graphResourceUrl;


    let configurationListGraphItem = configurationListGraph;
    context.log("ORC1002AzureDataCollectHandleGroupPolicy", "Gpo Name: " + configurationListGraphItem.displayName)

    let gpoSettings = [];

    // build definitionValues URL of the specific gpo object
    let definitionValuesGraphApiUrl = graphResourceUrl + "/" + configurationListGraphItem.id + "/definitionValues?$expand=definition"

    // query gpoDefinitions
    let graphQueryDefinitionValues = {
        graphResourceUrl: definitionValuesGraphApiUrl,
        accessToken: queryParameters.accessToken
    }

    let gpoDefinitionValuesResponse = yield context.df.callActivity("ACT2000MsGraphQuery", graphQueryDefinitionValues);

    if (gpoDefinitionValuesResponse && gpoDefinitionValuesResponse.result && gpoDefinitionValuesResponse.result.value) {
        let gpoDefinitionValues = gpoDefinitionValuesResponse.result.value

        let tasks = []
        for (let d = 0; d < gpoDefinitionValues.length; d++) {
            const child_id = context.df.instanceId + `:${d}`;
            let payload = {
                definitionValue: gpoDefinitionValues[d],
                graphResourceUrl: graphResourceUrl,
                graphItemId: configurationListGraphItem.id,
                accessToken: queryParameters.accessToken
            }
            tasks.push(context.df.callSubOrchestrator("ORC1003AzureDataCollectHandleGroupPolicySettings", payload, child_id));
        }
        let gpoSettings = yield context.df.Task.all(tasks);

        // sort gpo settings by definition@odata.bind to get the same result after every data check
        gpoSettings.sort(function (a, b) {
            let keyA = a["definition@odata.bind"];
            let keyB = b["definition@odata.bind"];
            // Compare the 2 values
            if (keyA < keyB) return -1;
            if (keyA > keyB) return 1;
            return 0;
        });
    }

    // append gpo settings into main gpo graph object
    configurationListGraphItem["gpoSettings"] = gpoSettings;

    return configurationListGraphItem;
});

export default orchestrator;
