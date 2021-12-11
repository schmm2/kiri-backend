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
import { Configuration } from "../models/configuration"
import { ConfigurationType } from "../models/configurationtype"
import { MsGraphResource } from "../models/msgraphresource"

const activityFunction: AzureFunction = async function (context: Context, configurationId): Promise<string> {
    let response = "";
    let configuration = await Configuration.findById(configurationId)

    if (configuration && configuration.configurationType) {
        let configurationType = await ConfigurationType.findById(configuration.configurationType)

        if (configurationType && configurationType.msGraphResource) {
            let msGraphResource = await MsGraphResource.findById(configurationType.msGraphResource)

            if (msGraphResource && msGraphResource.resource) {
                return msGraphResource
            }
        }
    }
    return response;
};

export default activityFunction;
