const express   = require('express');
const env       = require('./env');
const routes    = require('./routes');
const fault     = require('./middleware');

// ...

const app = express();
app.use(express.json());
app.use(fault);
app.use('/', routes);

// ...

app.listen(env.port, () => {
    console.log(`Listening on port ${env.port}`)
});

// Handle the SIGTERM signal for graceful shutdown.
process.on('SIGTERM', () => {
    console.log('API server: Shutdown...');

    server.close(() => {
        console.log('API server: Shutdown complete.');
        process.exit(0);   
    });
});