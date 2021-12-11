import { AzureFunction, Context, HttpRequest } from "@azure/functions"
const { Job } = require('../models/job');

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {   
    context.log("start clear logs");
    let jobs = await Job.deleteMany({})

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: jobs
    };
};

export default httpTrigger;