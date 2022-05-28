export default function logJobError(job, message) {
    job.log.push({ message: message, state: "ERROR" });
    if (job.state != 'ERROR') {
        job.state = 'ERROR'
    }
}