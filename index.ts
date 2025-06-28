import express, { type Request, type Response } from 'express';
import cors from 'cors';

interface ServiceInstance {
    timestamp: number;
    url: string;
    version: string;
}


type ServiceRegistry = Record<string, ServiceInstance>;

const app = express();

const TIMEOUT = 15;
const port = process.env.PORT || 3009;

const services: ServiceRegistry = {};

app.set('trust proxy', true);

app.use(express.json());
app.use(cors());

app.post('/register', (req, res) => {
    
    const { serviceName, version, url } = req.body;
    if (!serviceName || !version || !url) {
        res.status(400).json({ message: 'Service name, version, and URL are required.' });
        return;
    }
    const key = `${serviceName}@${version}`;
    const serviceUrl = new URL(url);

    if (!services[key]) {
        services[key] = {
            timestamp: Math.floor(Date.now() / 1000),
            url: serviceUrl.href,
            version: version
        };
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

app.get('/services', (req, res) => {
    // Object.values() extracts all the service instance objects from our registry into an array
    const serviceList = Object.values(services);
    
    res.status(200).json(serviceList);
});


app.listen(port, () => {
    console.log(`Discovery server listening on port ${port}`);
});
