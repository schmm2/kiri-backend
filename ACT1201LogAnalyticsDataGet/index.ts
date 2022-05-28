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
import { DefaultAzureCredential } from "@azure/identity";
import { Durations, LogsQueryClient, LogsQueryResultStatus, LogsTable } from "@azure/monitor-query";

const logAnalyticsWorkspaceId = process.env["LogAnalyticsWorkspace_ID"];
const logsQueryClient = new LogsQueryClient(new DefaultAzureCredential());

const activityFunction: AzureFunction = async function (context: Context): Promise<string> {
    const kustoQuery = "managedDevices_CL";
    const result = await logsQueryClient.queryWorkspace(logAnalyticsWorkspaceId, kustoQuery, {
        duration: Durations.twentyFourHours
    });

    return JSON.stringify(result);
};

export default activityFunction;
