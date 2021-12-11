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
import { createErrorResponse } from "../utils/createErrorResponse"
const functionName = "ACT2004MsGraphDelete"
const graphBaseUrl = "https://graph.microsoft.com/beta"

async function deleteGraphAPI(token, apiUrl) {
    const headers = new Headers()
    headers.append('Content-Type', 'application/json')
    headers.append('Authorization', `Bearer ${token}`)

    try {
        let response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: headers
        })
        if (response.status >= 400 && response.status < 600) {
            return { ok: false, message: "Bad response from server, statusText: " + response.statusText };
        };
        return { ok: true, message: 'Deleted' }
    } catch (error) {
        return { ok: false, message: error }
    }
}

const activityFunction: AzureFunction = async function (context: Context, queryParameters): Promise<string> {
    let accessToken = queryParameters.accessToken;
    let msGraphApiUrl = queryParameters.msGraphApiUrl;
    //context.log(functionName, "msgraph url " + msGraphApiUrl);

    // build final API Url
    let url = graphBaseUrl + msGraphApiUrl

    // patch resource via graph api
    let response: any = await deleteGraphAPI(accessToken, url);
    
    if(!response.ok){
        return createErrorResponse(response.message, context, functionName);
    }
    return response;
};

export default activityFunction;
