import express, { type Request, type Response } from "express";
import cors from "cors";

interface ServiceInstance {
  timestamp: number;
  url: string;
  version: string;
  status: "RUNNING" | "DOWN";
   serviceName: string; 
}

type ServiceRegistry = Record<string, Record<string, ServiceInstance[]>>;

const app = express();

const TIMEOUT = 15;
const port = process.env.PORT || 3009;

const services: ServiceRegistry = {};

app.set("trust proxy", true);

app.use(express.json());
app.use(cors());

app.post("/register", (req, res) => {
  const { serviceName, version, url } = req.body;
  if (!serviceName || !version || !url) {
    res.status(400)
      .json({ message: "Service name, version, and URL are required." });
      return;
  }

  // Ensure the top-level service name entry exists
  if (!services[serviceName]) {
    services[serviceName] = {};
  }
  // Ensure the version entry exists as an array
  if (!services[serviceName][version]) {
    services[serviceName][version] = [];
  }

  const instances = services[serviceName][version];
  const existingInstance = instances.find(inst => inst.url === url);

  if (existingInstance) {
    // This is a heartbeat for an existing instance
    if (existingInstance.status === "DOWN") {
      console.log(`Service instance revived: ${serviceName}@${version} at ${url}`);
    }
    existingInstance.timestamp = Math.floor(Date.now() / 1000);
    existingInstance.status = "RUNNING";
    console.log(`Heartbeat for instance: ${serviceName}@${version} at ${url}`);
    res.status(200).json({ message: `Heartbeat for instance received.` });
  } else {
    // This is a new instance for this service version
    const newInstance: ServiceInstance = {
      timestamp: Math.floor(Date.now() / 1000),
      url: url,
      version: version,
      status: "RUNNING",
      serviceName: serviceName
    };
    instances.push(newInstance);
    console.log(`Registered new instance: ${serviceName}@${version} at ${url}`);
    res.status(201).json({ message: `New instance registered successfully.` });
  }
});

app.get('/discover/:serviceName/:version', (req, res) => {
    const { serviceName, version } = req.params;
    
    const serviceVersions = services[serviceName];
    if (!serviceVersions) {
        res.status(404).json({ message: 'Service not found.' });
        return;
    }

    const instances = serviceVersions[version];
    if (!instances) {
        res.status(404).json({ message: 'Service version not found.' });
        return;
    }

    // Filter for only the instances that are currently running
    const runningInstances = instances.filter(inst => inst.status === 'RUNNING');

    if (runningInstances.length === 0) {
        res.status(404).json({ message: 'No running instances found for this service version.' });
        return;
    }

    // Randomly select one of the running instances to distribute load
    const randomIndex = Math.floor(Math.random() * runningInstances.length);
    const serviceInstance = runningInstances[randomIndex];
    
    res.status(200).json(serviceInstance);
});


app.delete("/unregister", (req, res) => {
  const { serviceName, version, url } = req.body;
  if (!serviceName || !version || !url) {
    res
      .status(400)
      .json({ message: "Service name, version, and URL are required to unregister." });
      return;
  }

  const serviceVersions = services[serviceName];
  if (!serviceVersions || !serviceVersions[version]) {
    res.status(404).json({ message: "Service not found." });
    return;
  }

  const instances = serviceVersions[version];
  const instanceIndex = instances.findIndex(inst => inst.url === url);

  if (instanceIndex > -1) {
    instances.splice(instanceIndex, 1); // Remove the instance from the array
    console.log(`Unregistered instance: ${serviceName}@${version} at ${url}`);
    // If this was the last instance for this version, clean up the version key
    if (instances.length === 0) {
        delete serviceVersions[version];
    }
    // If this was the last version for this service, clean up the service name key
    if (Object.keys(serviceVersions).length === 0) {
        delete services[serviceName];
    }
    res.status(200).json({ message: "Instance unregistered successfully." });
    return;
  }

  res.status(404).json({ message: "Specific instance not found." });
});

setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    // Iterate through each service name
    for (const serviceName in services) {
        // Iterate through each version of the service
        for (const version in services[serviceName]) {
            const instances = services[serviceName][version];
            if (!instances || instances.length === 0) {
                continue;
            }
            // Iterate through each instance of the version
            instances.forEach(instance => {
                if (instance.status === 'RUNNING' && (now - instance.timestamp > TIMEOUT)) {
                    console.log(`Instance timed out. Marking as DOWN: ${instance.serviceName}@${instance.version} at ${instance.url}`);
                    instance.status = 'DOWN';
                }
            });
        }
    }
}, 5000);


app.get('/services', (req, res) => {
    // The main services object is already in the desired grouped format
    res.status(200).json(services);
});

app.listen(port, () => {
  console.log(`Discovery server listening on port ${port}`);
});
