import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Job } from '../models/job';

const createMongooseClient = require('../shared/mongodb');

const jobCreate: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    let job = req.body || {}

    const db = await createMongooseClient()

    try {
        const newJob = await new Job(job).save();
        context.res = {
            status: 201,
            body: newJob
        }
    } catch (error) {
        console.log(error);
        context.res = {
            status: 500,
            body: 'Error creating a new Job'
        }
    }
    db.connection.close()
};

export default jobCreate;