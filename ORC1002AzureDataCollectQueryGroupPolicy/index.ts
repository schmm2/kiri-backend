﻿/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 * 
 */

import * as df from "durable-functions"
const functionName = "ORC1002AzureDataCollectQueryGroupPolicy"
const graphResourceUrl = "/deviceManagement/groupPolicyConfigurations"

const orchestrator = df.orchestrator(function* (context) {
    if (!context.df.isReplaying) context.log(functionName, "Start GPO Query");

    // Variables
    let gpoSettings = [];
    let queryParameters: any = context.df.getInput();
    let accessToken = queryParameters.accessToken;
    let graphId = queryParameters.graphId;

    // Query full GPO Graph Item
    let gpoQueryParameters = {
        accessToken: accessToken,
        graphResourceUrl: graphResourceUrl + "/" + graphId
    };

    let gpoGraphItemReponse = yield context.df.callActivity("ACT2001MsGraphGet", gpoQueryParameters);
    if (!context.df.isReplaying) context.log(gpoGraphItemReponse)

    if (gpoGraphItemReponse && gpoGraphItemReponse.data && gpoGraphItemReponse.data.id) {
        let gpoGraphItem = gpoGraphItemReponse.data;
        if (!context.df.isReplaying) context.log(functionName, "Gpo Name: " + gpoGraphItem.displayName)

        // build definitionValues URL of the specific gpo object
        let definitionValuesGraphApiUrl = graphResourceUrl + "/" + gpoGraphItem.id + "/definitionValues?$expand=definition"

        // Query gpoDefinitions
        let graphQueryDefinitionValues = {
            graphResourceUrl: definitionValuesGraphApiUrl,
            accessToken: accessToken
        }

        let gpoDefinitionValuesResponse = yield context.df.callActivity("ACT2001MsGraphGet", graphQueryDefinitionValues);

        if (gpoDefinitionValuesResponse && gpoDefinitionValuesResponse.data && gpoDefinitionValuesResponse.data.value) {
            let gpoDefinitionValues = gpoDefinitionValuesResponse.data.value

            let tasks = []
            for (let d = 0; d < gpoDefinitionValues.length; d++) {
                const child_id = context.df.instanceId + `:${d}`;
                let payload = {
                    definitionValue: gpoDefinitionValues[d],
                    graphResourceUrl: graphResourceUrl,
                    graphItemId: gpoGraphItem.id,
                    accessToken: queryParameters.accessToken
                }
                tasks.push(context.df.callSubOrchestrator("ORC1003AzureDataCollectQueryGroupPolicySettings", payload, child_id));
            }
            if (tasks.length > 0) {
                gpoSettings = yield context.df.Task.all(tasks);
            }

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
        gpoGraphItem["gpoSettings"] = gpoSettings;
        return gpoGraphItem;
    } else {
        return null
    }
});

export default orchestrator;
