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
import { Configuration } from "../models/configuration"

const activityFunction: AzureFunction = async function (context: Context, configurationId): Promise<any> {
    try {
        // delete corresponding versions
        let removalConfigurationVersionResponse = await ConfigurationVersion.deleteMany({ configuration: configurationId });
        // delete config
        let removalConfigurationResponse = await ConfigurationVersion.deleteOne({ _id: configurationId });
    } catch {
        context.log("error while deleting configuration " + configurationId)
        return {
            ok: false
        };
    }

    return {
        ok: true
    };
};

export default activityFunction;
