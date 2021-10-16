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

const activityFunction: AzureFunction = async function (context: Context, jobParameters): Promise<string> { 
    //console.log(jobParameters);

    let Job = mongoose.model('Job');

    const newJob = await Job.create(jobParameters);
    //console.log("created job", newJob._id);

    return newJob;
};

export default activityFunction;
