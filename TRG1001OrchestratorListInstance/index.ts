import * as df from "durable-functions"
import { AzureFunction, Context, HttpRequest } from "@azure/functions"


const httpStart: AzureFunction = async function (context: Context, req: HttpRequest): Promise<any> {
    context.log("TRG1001OrchestratorListInstance","Start");

    const client = df.getClient(context);
    const instances = await client.getStatusAll();
    let runningTasks = [];
    
    instances.forEach((instance) => {
        if(instance.runtimeStatus === df.OrchestrationRuntimeStatus.Running){
            // context.log(JSON.stringify(instance));
            
            runningTasks.push({
                name: instance.name,
                instanceId: instance.instanceId,
                createdTime: instance.createdTime,
                lastUpdatedTime: instance.lastUpdatedTime
            })
        }
    });

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: JSON.stringify(runningTasks)
    };
};

export default httpStart;