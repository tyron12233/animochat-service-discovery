import express, { type Request, type Response } from 'express';
import cors from 'cors';

interface ServiceInstance {
    timestamp: number;
    url: string;
    version: string;
    ip: string;
    port: number;
}


type ServiceRegistry = Record<string, ServiceInstance>;

const app = express();
const TIMEOUT = 15;
const port = process.env.PORT || 3009;

const services: ServiceRegistry = {};

app.use(express.json());
app.use(cors());

app.post('/register', (req, res) => {
    
    const { serviceName, version, port } = req.body;
    const ip = req.ip!.includes('::') ? `[${req.ip!}]` : req.ip;
    if (!serviceName || !version || !port || !ip) {
        res.status(400).json({ error: 'Missing required fields: serviceName, version, or port.' });
        return;
    }
    const key = `${serviceName}@${version}`;
    const serviceUrl = `https://${ip}:${port}`;

    if (!services[key]) {
        services[key] = {
            timestamp: Math.floor(Date.now() / 1000),
            url: serviceUrl,
            serviceName,
            version,
            ip,
            port
        } as ServiceInstance;
        console.log(`Registered service: ${key} at ${serviceUrl}`);
        res.status(201).json({ message: `Service ${key} registered successfully.` });
        return;
    }

    services[key].timestamp = Math.floor(Date.now() / 1000);
    console.log(`Heartbeat for service: ${key}`);
    res.status(200).json({ message: `Heartbeat for ${key} received.` });
});

app.get('/discover/:serviceName/:version', (req, res) => {
    const { serviceName, version } = req.params;
    const key = `${serviceName}@${version}`;
    const service = services[key];

    if (!service) {
        res.status(404).json({ message: 'Service not found.' });
        return;
    }

    // Return the service instance data, including its URL
    res.status(200).json(service);
    return;
});

app.delete('/unregister', (req, res) => {
    const { serviceName, version } = req.body;
    const key = `${serviceName}@${version}`;

    if (services[key]) {
        delete services[key];
        console.log(`Unregistered service: ${key}`);
        res.status(200).json({ message: `Service ${key} unregistered.` });
        return;
    }

    res.status(404).json({ message: 'Service not found.' });
});

setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    for (const key in services) {
        const service = services[key];
        if (service && now - service.timestamp > TIMEOUT) {
            console.log(`Service ${key} timed out. Removing.`);
            delete services[key];
        }
    }
}, 5000); 


app.listen(port, () => {
    console.log(`Discovery server listening on port ${port}`);
});
