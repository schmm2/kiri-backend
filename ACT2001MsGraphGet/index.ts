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
import isValidHttpUrl from "../utils/isValidHttpUrl"
const functionName = "ACT2001MsGraphGet"
const graphBaseUrl = "https://graph.microsoft.com"

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
            return { ok: false, message: "Bad response from server, code: " + response.status + ", statusText: " + response.statusText };
        };
    }
    catch (err) {
        // http error
        return { ok: false, message: err }
    }

    // all other stuff
    return { ok: false, message: "udnefined error" }
}

const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<ActivityMessage> {
    let response = null
    let apiVersion = parameter.apiVersion ? parameter.apiVersion : "beta";

    if (parameter.accessToken) {
        let accessToken = parameter.accessToken;

        if (parameter.graphResourceUrl) {
            // build url
            // graphResourceUrl start with a / so no need to add one
            let url = graphBaseUrl + "/" + apiVersion + parameter.graphResourceUrl

            // add filter
            // Untested
            /*if (parameter.filter) {
                url = url + "/" + parameter.filter;
            }*/

            // add expand 
            if (parameter.expandAttributes) {
                let expandString = "?$expand=" + parameter.expandAttributes.join()
                url = url + expandString
            }

            if (isValidHttpUrl(url)) {
                response = await getGraphAPI(accessToken, url);
                // context.log("query resources " + url )
                // context.log(functionName, response);
            } else {
                throw new Error("invalid url: " + url)
            }

            if (!response.ok) {
                let message = "Url: " + url + ", message: " + response.message
                //createErrorResponse(message, context, functionName)
                throw new Error(message)
            }
        } else {
            throw new Error("No API Url defined")
        }
    } else {
        throw new Error("No AccessToken defined")
    }
    // return result
    // context.log(response);
    return response;
};

export default activityFunction;
