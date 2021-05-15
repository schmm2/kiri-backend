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
    console.log("ORC1002AzureDataCollectHandleGroupPolicy", "Start GPO Handler");

    let queryParameters: any = context.df.getInput();
    let configurationListGraph = queryParameters.graphValue;
    let graphResourceUrl = queryParameters.graphResourceUrl;

    console.log("ORC1002AzureDataCollectHandleGroupPolicy", "prepare " + configurationListGraph.length + " GPOs")

    // loop through all items collected via graph
    for (let i = 0; i < configurationListGraph.length; i++) {
        console.log("ORC1002AzureDataCollectHandleGroupPolicy", "prepare GPO " + (i + 1) + " of " + configurationListGraph.length)

        let configurationListGraphItem = configurationListGraph[i];
        console.log("ORC1002AzureDataCollectHandleGroupPolicy", "Gpo Name: " + configurationListGraphItem.displayName)

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

            for (let d = 0; d < gpoDefinitionValues.length; d++) {
                let definitionValue = gpoDefinitionValues[d];

                // prepare settings object
                let settingsObj = {
                    "enabled": definitionValue.enabled,
                    "definition@odata.bind": "https://graph.microsoft.com/beta/deviceManagement/groupPolicyDefinitions('" + definitionValue.definition.id + "')"
                }

                // get all presentationValues of the specific definitionValue
                let presentationValuesGraphApiUrl = graphResourceUrl + "/" + configurationListGraphItem.id + "/definitionValues/" + definitionValue.id + "/presentationValues?$expand=presentation";
                //console.log(presentationValuesGraphApiUrl);

                let graphQueryPresentationValues = {
                    graphResourceUrl: presentationValuesGraphApiUrl,
                    accessToken: queryParameters.accessToken
                }

                let gpoPresentationValuesResponse = yield context.df.callActivity("ACT2000MsGraphQuery", graphQueryPresentationValues);

                if (gpoPresentationValuesResponse && gpoPresentationValuesResponse.result && gpoPresentationValuesResponse.result.value) {
                    let gpoPresentationValues = gpoPresentationValuesResponse.result.value;

                    if (gpoPresentationValues.length > 0) {
                        settingsObj["presentationValues"] = []

                        for (let p = 0; p < gpoPresentationValues.length; p++) {
                            let presentationValue = gpoPresentationValues[p];
                            // console.log(presentationValue);

                            // Add presentation@odata.bind property that links the value to the presentation object
                            presentationValue["presentation@odata.bind"] = "https://graph.microsoft.com/beta/deviceManagement/groupPolicyDefinitions('" + definitionValue.definition.id + "')/presentations('" + presentationValue.presentation.id + "')";

                            // Remove presentation object so it is not included
                            delete presentationValue.presentation
                            delete presentationValue.id
                            delete presentationValue.lastModifiedDateTime
                            delete presentationValue.createdDateTime

                            // Add presentation value to the list
                            settingsObj["presentationValues"].push(presentationValue)
                            // console.log(presentationValue);
                        }
                    }
                }
                gpoSettings.push(settingsObj)
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
    };
    // console.log("WOW");
    // console.log(configurationListGraph);

    //queryParameters["graphValue"] = configurationListGraph; 
    //let response = yield context.df.callActivity("ACT3001AzureDataCollectHandleConfiguration", queryParameters);

    return configurationListGraph;
});

export default orchestrator;
