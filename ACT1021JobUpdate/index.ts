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

const activityFunction: AzureFunction = async function (context: Context, job): Promise<string> {
    //console.log("ACT1021JobUpdate", job);

    let Job = mongoose.model('Job');

    // update job
    let updatedJob = Job.findOneAndUpdate(
        { _id: job._id },
        job,
        (err, doc) => { if (err) { console.log("mongoose: error updating job " + job._id) } }
    );
    return job;
};

export default activityFunction;
