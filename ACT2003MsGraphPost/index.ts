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

const functionName = "ACT2003MsGraphPost"
const graphBaseUrl = "https://graph.microsoft.com/beta"

async function postGraphAPI(token, apiUrl, body): Promise<ActivityMessage> {
    const headers = new Headers()
    headers.append('Content-Type', 'application/json')
    headers.append('Authorization', `Bearer ${token}`)

    try {
        let response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        })
        // OK
        if (response.status >= 200 && response.status < 300) {
            let data = await response.json();
            return { ok: true, message: response.statusText, data: data }
        } // Error
        else if (response.status >= 400 && response.status < 600) {
            return { ok: false, message: "Bad response from server, code: " + response.status + ", statusText: " + response.statusText };
        };
    } catch (error) {
        // rethrow error
        let message = "Url: " + apiUrl + ", message: " + error
        throw new  Error(message)
    }

    // all other stuff
    return { ok: false, message: "undefined error" }
}


const activityFunction: AzureFunction = async function (context: Context, queryParameters): Promise<ActivityMessage> {
    let accessToken = queryParameters.accessToken;
    let msGraphApiUrl = queryParameters.msGraphApiUrl;
    let dataObject = queryParameters.dataObject
    let url = graphBaseUrl + msGraphApiUrl

    // add whatif 
    if (queryParameters.whatif) {
        url = url + "?whatif"
    }

    // post resource via graph api
    let response: ActivityMessage = await postGraphAPI(accessToken, url, dataObject);
    return response;
};

export default activityFunction;
