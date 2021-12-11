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
import { ConfigurationVersion } from "../models/configurationversion"

const activityFunction: AzureFunction = async function (context: Context, configurationId): Promise<string> {
    let configurationVersions = await ConfigurationVersion.find({ configuration: configurationId, isNewest: true });
    if (configurationVersions.length == 1) {
        return configurationVersions[0]
    }
    return;
};
export default activityFunction;
