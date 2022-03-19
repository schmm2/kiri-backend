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

const activityFunction: AzureFunction = async function (context: Context, tenantId): Promise<any> {
    let configurations = await Configuration.find({ tenant: tenantId });
    let newestConfigurationVersions = []

    for (let c = 0; c < configurations.length; c++) {
        let configuration = configurations[c];

        if (configuration._id) {
            let configurationVersions = await ConfigurationVersion.find({ isNewest: true, configuration: configuration._id })
            // context.log(configurationVersions)

            if (configurationVersions.length > 0) {
                // context.log(configurationVersions[0])
                let configurationVersionAdapated = JSON.parse(JSON.stringify(configurationVersions[0]));
                configurationVersionAdapated["graphId"] = configuration.graphId
                newestConfigurationVersions.push(configurationVersionAdapated)
            }
        }
    }
    return newestConfigurationVersions
};

export default activityFunction;
