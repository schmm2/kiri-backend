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
import { createErrorResponse } from "../utils/createErrorResponse"
let functionName = "ORC1003AzureDataCollectQueryGroupPolicySettings"

const orchestrator = df.orchestrator(function* (context) {
    queryParameters = context.df.getInput();
    let definitionValue = queryParameters.definitionValue;
    let graphResourceUrl = queryParameters.graphResourceUrl;
    let graphItemId = queryParameters.graphItemId;
    let gpoPresentationValuesResponse = null;

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

    // retry options
    const firstRetryIntervalInMilliseconds = 1000;
    const maxNumberOfAttempts = 2
    const retryOptions = new df.RetryOptions(firstRetryIntervalInMilliseconds, maxNumberOfAttempts);

    try {
        gpoPresentationValuesResponse = yield context.df.callActivityWithRetry("ACT2001MsGraphGet", retryOptions, graphQueryPresentationValues);
    } catch (err) {
        throw new Error(err)
    }

    // double check if data has been recieved correctly
    if (gpoPresentationValuesResponse && gpoPresentationValuesResponse.data && gpoPresentationValuesResponse.data.value) {
        let gpoPresentationValues = gpoPresentationValuesResponse.data.value;

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
    else {
        throw new Error("unable to query gpoPresentationValues " + graphQueryPresentationValues.graphResourceUrl)
    }

    return settingsObj;
});

export default orchestrator;
