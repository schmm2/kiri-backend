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
import { ConfigurationVersion } from "../models/configurationversion";
import { Configuration } from "../models/configuration";

const activityFunction: AzureFunction = async function (context: Context, graphId): Promise<string> {
    let configurations = await Configuration.find({ graphId: graphId });

    if (configurations.length > 0) {
        let configuration = configurations[0]
        // context.log(configuration)
        // context.log(configuration._id);

        if (configuration._id) {
            let configurationVersions = await ConfigurationVersion.find({ isNewest: true, configuration: configuration._id })
            // context.log(configurationVersions)

            if (configurationVersions.length > 0) {
                // context.log(configurationVersions[0])
                return configurationVersions[0]
            }
        }
    }
    return null
};

export default activityFunction;
