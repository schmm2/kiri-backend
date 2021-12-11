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

const functionName = "ACT2005MsGraphPut"
const graphBaseUrl = "https://graph.microsoft.com/beta"

async function putGraphAPI(token, apiUrl, body): Promise<ActivityMessage> {
    const headers = new Headers()
    headers.append('Content-Type', 'application/json')
    headers.append('Authorization', `Bearer ${token}`)

    try {
        let response = await fetch(apiUrl, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(body)
        })
        if (response.status >= 400 && response.status < 600) {
            return { ok: false, message: "Bad response from server, statusText: " + response.statusText };
        };
        let data = await response.json();
        return { ok: true, message: response.statusText, data: data }
    } catch (error) {
        return { ok: false, message: error }
    }
}


const activityFunction: AzureFunction = async function (context: Context, queryParameters): Promise<ActivityMessage> {
    let accessToken = queryParameters.accessToken;
    let msGraphApiUrl = queryParameters.msGraphApiUrl;
    let dataObject = queryParameters.dataObject
    let url = graphBaseUrl + msGraphApiUrl

    // post resource via graph api
    let response: ActivityMessage = await putGraphAPI(accessToken, url, dataObject);
    //context.log(url);
    //context.log(dataObject);

    if (!response.ok) {
        return createErrorResponse(response.message, context, functionName);
    }
    return response;
};

export default activityFunction;
