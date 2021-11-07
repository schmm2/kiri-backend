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
import { DeploymentReference } from '../models/deploymentreference'

const activityFunction: AzureFunction = async function (context: Context, tenantId): Promise<string> {
    return DeploymentReference.find({ tenant: tenantId })
};

export default activityFunction;
