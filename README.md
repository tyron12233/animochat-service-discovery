# AnimoChat Service Discovery

## Overview

AnimoChat Service Discovery is a lightweight, centralized registry for microservices within the AnimoChat ecosystem. It allows services to register themselves, making them discoverable by other services. It also provides a basic health check mechanism to ensure that only active, "running" services are discoverable, helping to build a resilient and scalable microservices architecture.

The core responsibilities of this server are:
-   **Service Registration:** Allowing microservices to announce their presence, version, and location (URL).
-   **Service Discovery:** Enabling other services to find the location of a specific version of a required service.
-   **Health Checking:** Periodically monitoring registered services via a heartbeat mechanism and marking unresponsive instances as "DOWN".
-   **Load Balancing:** Providing a basic, randomized load balancing by returning a random instance when multiple are available.

---

## Features

-   **Dynamic Registration & Unregistration:** Services can be added or removed from the registry at runtime.
-   **Heartbeat Mechanism:** Registered services send periodic "heartbeats" to the `/register` endpoint to signal they are still alive.
-   **Automatic Timeout:** The server automatically marks services as "DOWN" if they fail to send a heartbeat within a configurable timeout period (default: 15 seconds).
-   **Version-Based Discovery:** Services are discovered by their name and a specific version, allowing for seamless upgrades and rollouts (e.g., A/B testing, canary releases).
-   **Simple Load Balancing:** When multiple instances of a service version are available, the discovery endpoint returns one at random to distribute the load.
-   **Full Service Visibility:** An endpoint is available to view the entire registry of services, their versions, and the status of each instance.

---

## API Endpoints

### 1. Register or Send Heartbeat

Registers a new service instance or updates the timestamp for an existing one (acting as a heartbeat). If a "DOWN" service sends a heartbeat, it is revived and marked as "RUNNING".

-   **Endpoint:** `POST /register`
-   **Content-Type:** `application/json`
-   **Body:**

    ```json
    {
      "serviceName": "authentication-service",
      "version": "1.0.2",
      "url": "[http://192.168.1.10:8080](http://192.168.1.10:8080)"
    }
    ```

-   **Success Responses:**
    -   `201 Created`: If a new instance is registered successfully.
    -   `200 OK`: If a heartbeat for an existing instance is received.
-   **Error Response:**
    -   `400 Bad Request`: If `serviceName`, `version`, or `url` are missing from the request body.

### 2. Discover a Service

Finds an active, "RUNNING" instance of a specific service version. If multiple instances are available, one is chosen at random.

-   **Endpoint:** `GET /discover/:serviceName/:version`
-   **URL Parameters:**
    -   `serviceName` (string): The name of the service to discover (e.g., `authentication-service`).
    -   `version` (string): The specific version of the service (e.g., `1.0.2`).
-   **Success Response (`200 OK`):**
    Returns a JSON object representing the service instance.
    ```json
    {
        "timestamp": 1678886400,
        "url": "[http://192.168.1.10:8080](http://192.168.1.10:8080)",
        "version": "1.0.2",
        "status": "RUNNING",
        "serviceName": "authentication-service"
    }
    ```
-   **Error Responses:**
    -   `404 Not Found`: If the service, version, or any running instances cannot be found.

### 3. Unregister a Service

Manually removes a specific service instance from the registry.

-   **Endpoint:** `DELETE /unregister`
-   **Content-Type:** `application/json`
-   **Body:**

    ```json
    {
      "serviceName": "authentication-service",
      "version": "1.0.2",
      "url": "[http://192.168.1.10:8080](http://192.168.1.10:8080)"
    }
    ```
-   **Success Response (`200 OK`):**
    `{ "message": "Instance unregistered successfully." }`
-   **Error Responses:**
    -   `400 Bad Request`: If required fields are missing.
    -   `404 Not Found`: If the service, version, or specific instance URL is not found in the registry.

### 4. List All Services

Retrieves the entire service registry, showing all services, their versions, and all registered instances (both "RUNNING" and "DOWN").

-   **Endpoint:** `GET /services`
-   **Success Response (`200 OK`):**
    Returns a nested JSON object representing the entire registry.
    ```json
    {
      "authentication-service": {
        "1.0.2": [
          {
            "timestamp": 1678886400,
            "url": "[http://192.168.1.10:8080](http://192.168.1.10:8080)",
            "version": "1.0.2",
            "status": "RUNNING",
            "serviceName": "authentication-service"
          }
        ],
        "1.0.1": [
          {
            "timestamp": 1678886300,
            "url": "[http://192.168.1.5:8080](http://192.168.1.5:8080)",
            "version": "1.0.1",
            "status": "DOWN",
            "serviceName": "authentication-service"
          }
        ]
      },
      "chat-service": {
        "2.1.0": [
          {
            "timestamp": 1678886405,
            "url": "[http://192.168.1.12:9000](http://192.168.1.12:9000)",
            "version": "2.1.0",
            "status": "RUNNING",
            "serviceName": "chat-service"
          }
        ]
      }
    }
    ```

---

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (version 14.x or higher)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1.  Clone the repository:
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Server

To start the discovery server, run the following command:
```bash
npm start
```
or
```bash
node index.js
```

By default, the server will be running on `http://localhost:3009`.

### Configuration

You can configure the server using environment variables.

-   **`PORT`**: The port number for the server to listen on.
    -   Example: `PORT=3000 npm start`
-   **`TIMEOUT`**: While hardcoded to 15 seconds, this can be externalized to an environment variable for more flexibility.
