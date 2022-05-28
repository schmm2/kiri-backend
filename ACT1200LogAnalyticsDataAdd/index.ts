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
import { pushToLogAnalytics } from "../utils/pushToLogAnalytics";
var flatten = require('flat')

const activityFunction: AzureFunction = async function (context: Context, parameter): Promise<string> {
    const logAnalyticsWorkspaceId = process.env["LogAnalyticsWorkspace_ID"];
    const logAnalyticsWorkspaceKey = process.env["LogAnalyticsWorkspace_Key"];

    const laws = {
        id: logAnalyticsWorkspaceId,
        key: logAnalyticsWorkspaceKey,
        rfc1123date: (new Date).toUTCString(),
        LogType: parameter.logType
    }

    let response = await pushToLogAnalytics(parameter.data, laws)
    return JSON.stringify(response);
};

export default activityFunction;
