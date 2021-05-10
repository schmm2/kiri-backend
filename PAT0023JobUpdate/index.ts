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
const createMongooseClient = require('../shared/mongodb');
var mongoose = require('mongoose');

const activityFunction: AzureFunction = async function (context: Context, jobData): Promise<string> {
    console.log("PAT0023JobUpdate", jobData);

    const db = await createMongooseClient()
    let Job = mongoose.model('Job');

    // update job
    let updatedJob = Job.update(
        { _id: jobData._id },
        { $set: { state: jobData.state } },
        (err, doc) => { if (err) { console.log("mongoose: error updating job " + jobData._id) } }
    );

    return updatedJob;
};

export default activityFunction;
