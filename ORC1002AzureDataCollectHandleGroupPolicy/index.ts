/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 * 
 */

import * as df from "durable-functions"

const orchestrator = df.orchestrator(function* (context) {
    if (!context.df.isReplaying) context.log("ORC1002AzureDataCollectHandleGroupPolicy", "Start GPO Handler");

    let gpoSettings = [];
    let queryParameters: any = context.df.getInput();
    let configurationListGraphItem = queryParameters.graphValue;
    let graphResourceUrl = queryParameters.graphResourceUrl;

    // PRECHECK
    // to query administrative templates is alot of work for the system as there are many definitionValues & presentationvalues to query
    // this pre-check should speed things up
    // check DB to see if this object already exists, if modiefied dates are the same we skip this config
    let newestConfigurationVersionInDB = yield context.df.callActivity("ACT1041ConfigurationVersionNewestByGraphId", configurationListGraphItem.id);

    if (newestConfigurationVersionInDB && newestConfigurationVersionInDB.graphModifiedAt) {
        // context.log(newestConfigurationVersionInDB)
        // compare config update date
        if (newestConfigurationVersionInDB.graphModifiedAt === configurationListGraphItem.lastModifiedDateTime) {
            // seems to be the same config version, stop here
            return null
        }
    }

    if (!context.df.isReplaying) context.log("ORC1002AzureDataCollectHandleGroupPolicy", "Gpo Name: " + configurationListGraphItem.displayName)

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
    configurationListGraphItem["gpoSettings"] = gpoSettings;
    return configurationListGraphItem;
});

export default orchestrator;
