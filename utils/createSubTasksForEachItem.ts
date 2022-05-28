export default function createSubTasksForEachItem(context, parameter, activity) {
    const tasks = [];

    for (let i = 0; i < parameter.payload.length; i++) {
        let parameterPerItem = { ...parameter }
        // replace payload with item specific payload 
        parameterPerItem.payload = parameter.payload[i];
        tasks.push(context.df.callActivity(activity, parameterPerItem));
    }
    // if (!context.df.isReplaying) context.log("started " + tasks.length + " tasks")
    return tasks;
}