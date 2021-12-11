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
var mongoose = require('mongoose');

const activityFunction: AzureFunction = async function (context: Context, deployment): Promise<string> {
    let Deployment = mongoose.model('Deployment');

    // update job
    let updatedDeployment = Deployment.findOneAndUpdate(
        { _id: deployment._id },
        deployment,
        (err, doc) => {
            if (err) {
                context.log.error("mongoose: error updating deployment " + deployment._id)
                context.log.error(err)
            }
        }
    );
    return deployment;
};

export default activityFunction;
