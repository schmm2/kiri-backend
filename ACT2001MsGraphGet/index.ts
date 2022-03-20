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
const functionName = "ACT2001MsGraphGet"
const graphBaseUrl = "https://graph.microsoft.com/beta"

async function getGraphAPI(token, apiUrl): Promise<ActivityMessage> {
    const headers = new Headers()
    headers.append('Content-Type', 'application/json')
    headers.append('Authorization', `Bearer ${token}`)

    try {
        let response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers
        })

        // Handle Status
        // OK
        if (response.status >= 200 && response.status < 300) {
            let data = await response.json();
            return { ok: true, message: '', data: data }
        }
        // Bad Server Response
        else if (response.status >= 400 && response.status < 600) {
            return { ok: false, message: "Bad response from server, statusText: " + response.statusText };
        };
        // all other stuff
        return { ok: false, message: "htpp error: " + response.statusText }
    } catch (error) {
        return { ok: false, message: error }
    }
}

const activityFunction: AzureFunction = async function (context: Context, msGraphResource): Promise<ActivityMessage> {
    let response = null

    if (msGraphResource.accessToken) {
        let accessToken = msGraphResource.accessToken;

        if (msGraphResource.graphResourceUrl) {
            // build url
            let url = graphBaseUrl + msGraphResource.graphResourceUrl

            // build filter
            if (msGraphResource.filter) {
                url = url + "/" + msGraphResource.filter;
            }

            //console.log("query resources " + msGraphResource.graphResourceUrl )
            response = await getGraphAPI(accessToken, url);
            // context.log(functionName, response);

            if (!response.ok) {
                let message = "Url: " + url + ", message: " + response.message
                createErrorResponse(message, context, functionName)
                throw new Error(message)
            }
        } else {
            let message = "No API Url defined"
            createErrorResponse(message, context, functionName)
            throw new Error(message)
        }
    } else {
        let message = "No AccessToken defined"
        createErrorResponse(message, context, functionName)
        throw new Error(message)
    }
    // return result
    // context.log(response);
    return response;
};

export default activityFunction;
