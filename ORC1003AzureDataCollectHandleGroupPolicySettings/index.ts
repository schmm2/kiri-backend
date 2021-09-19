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
let queryParameters: any;

const orchestrator = df.orchestrator(function* (context) {
    queryParameters = context.df.getInput();
    let definitionValue = queryParameters.definitionValue;
    let graphResourceUrl = queryParameters.graphResourceUrl;
    let graphItemId = queryParameters.graphItemId;

    // prepare settings object
    let settingsObj = {
        "enabled": definitionValue.enabled,
        "definition@odata.bind": "https://graph.microsoft.com/beta/deviceManagement/groupPolicyDefinitions('" + definitionValue.definition.id + "')"
    }

    // get all presentationValues of the specific definitionValue
    let presentationValuesGraphApiUrl = graphResourceUrl + "/" + graphItemId + "/definitionValues/" + definitionValue.id + "/presentationValues?$expand=presentation";
    // if (!context.df.isReplaying) context.log(presentationValuesGraphApiUrl);

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
                // if (!context.df.isReplaying) context.log(presentationValue);

                // Add presentation@odata.bind property that links the value to the presentation object
                presentationValue["presentation@odata.bind"] = "https://graph.microsoft.com/beta/deviceManagement/groupPolicyDefinitions('" + definitionValue.definition.id + "')/presentations('" + presentationValue.presentation.id + "')";

                // Remove presentation object so it is not included
                delete presentationValue.presentation
                delete presentationValue.id
                delete presentationValue.lastModifiedDateTime
                delete presentationValue.createdDateTime

                // Add presentation value to the list
                settingsObj["presentationValues"].push(presentationValue);
            }
        }
    }
    return settingsObj;
});

export default orchestrator;
