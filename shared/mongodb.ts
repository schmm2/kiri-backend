const mongoose = require('mongoose');
const mongodbConnectionString = "mongodb://kiri-database-dev:SROaS8VyaeHotu5p3RvY9CtQqzheuf8GNlZ6fn5hJbCgZyeMWME5PsgPzXbCAzIz2Kia9jq71NQjuYnj7Yqdyg%3D%3D@kiri-database-dev.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@kiri-database-dev@"

const config = {
    dbName: "kiri"
};

async function createConnection() {

    mongoose.Promise = Promise

    mongoose.connection.on('connected', () => {
        console.log('Connection Established')
    })

    mongoose.connection.on('reconnected', () => {
        console.log('Connection Reestablished')
    })

    mongoose.connection.on('disconnected', () => {
        console.log('Connection Disconnected')
    })

    mongoose.connection.on('close', () => {
        console.log('Connection Closed')
    })

    mongoose.connection.on('error', (error) => {
        console.log('ERROR: ' + error)
    })

    // connect db
    let db = await mongoose.connect(mongodbConnectionString, {
        useNewUrlParser: true,
        dbName: config.dbName
    });

    return db;
}

module.exports = createConnection;