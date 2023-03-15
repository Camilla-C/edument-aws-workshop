# Exercises
Description of exercises for the _Translation Management Systems (TMS)_ sample application implemented during the workshop __Cloud Native Application Development with AWS Container Services__.

**Make sure to read and follow the instructions for each exercise carefully!**

## Aborting Deployment
If an error occurs while deploying code with the AWS Copilot CLI, **do not** Ctrl+C to abort!

> An error might occur while starting up new tasks, and Copilot will try up to ten times before aborting, but this takes a significant time.

You can change the state of deployment by setting the number of running tasks to zero (and thereby trigger a safe abort) as follows:

*   In the AWS Console, navigate to the **ECS** service.

*   Click **Clusters** and choose your cluster.

*   Scroll down to the section named **Services** and select the service that is failing to deploy.

*   On the service page, click on the button **Update service**.

*   In the field **Desired tasks**, specify _0_.

*   Scroll down and click the **Update** button.

After a while, your deployment in the terminal will abort successfully; fix the breaking code and deploy again.

## Exercise 1: TMS API 
In this exercise, an AWS Copilot [Load Balanced Web Service](https://aws.github.io/copilot-cli/docs/concepts/services/#load-balanced-web-service) for the _TMS API_ is created and deployed.

A basic API server exists in `src/api` with the following endpoints defined in `src/api/routes.js`:

    GET   /status/:id
    GET   /content/:id
    POST  /content

> All routes just return a (dummy) response of 'OK' for now.

A Load Balanced Web Service must support _health checks_ and handle shutdowns gracefully:

*   Add a health check route for `GET /healthz` that simply responds with a status code of _200_ (OK).

*   Handle the SIGTERM signal for graceful shutdown.

    This [article](https://aws.amazon.com/blogs/containers/graceful-shutdowns-with-ecs/) describes graceful shutdown in AWS ECS - search "Node handler" for a Node example. 
    
    **[Close](https://nodejs.org/api/http.html#serverclosecallback) the Express server upon shutdown** (and add a log message to indicate that this occurs).

Test the containerized API server by:

*   Building its Docker image:

        docker build -t tms-api:v1 . 

*   Run a container:

        docker run -d -p 80:80 tms-api:v1

*   Verify that the API server works by sending a request to one of the endpoints.

*   Stop the container by running:

        docker stop <CONTAINER_ID>

    > Get the CONTAINER_ID via `docker ps`.

*   Check that the API server was shut down gracefully (your shutdown message should've been logged):

        docker logs <CONTAINER_ID>

*   Remove the container and image (locally):

        docker rm <CONTAINER_ID>
        docker rmi tms-api:v1

### Deployment
Create a Copilot application by running:

    copilot app init

in the **project root folder** and following the instructions.

> Note: The name of the _application_ should be `tms`.

Next, create and deploy a **test** environment for our application:

    copilot env init --name test

> Select your _default_ AWS profile when prompted.

    copilot env deploy --name test

Next, create the _TMS API_ service:

    copilot svc init --name api --svc-type "Load Balanced Web Service" --dockerfile modules/api/Dockerfile

Open `copilot/api/manifest.yml` and change the path for the [health check](https://aws.github.io/copilot-cli/docs/manifest/lb-web-service/#http-healthcheck) to `/healthz`.

Finally, run:

    copilot svc deploy --name api

Test the API running on AWS by invoking the Load Balanced Web Service URL (see the aforementioned API endpoints).

## Exercise 2: Service-to-Service Communication
In this exercise, an AWS Copilot [Backend Service](https://aws.github.io/copilot-cli/docs/concepts/services/#backend-service) for the _TMS Content_ service is created and deployed.

The _TMS Content_ service will be invoked directly (synchronously) by the _TMS API_.

In the `modules/api` folder:

*   In `src/routes.js`, for the available routes, use the `axios` library to make the required calls to the _TMS Content_ service.

    > Note: The URL of the _TMS Content_ service will be: `http://content`.

*   In `src/index.js`, add (_only_) SIGTERM handling, just like you did for the _TMS API_ service in the previous exercise. 

You can use [Docker Compose](https://docs.docker.com/compose/) to locally test the interaction between the two services:

*   Create a folder named `etc` in the `modules` folder and in it, add a file named `docker-compose-ex2.yaml` with the following:

    ```
    services:
        api:
            build: ../api/
            ports:
                - "80:80"
        content:
            build: ../content
    ```

    This sets up two services named `api` and `content`.

    > Why aren't `ports` defined for the `content` service?

*   Launch the two services (from the `etc` folder):

        docker compose -f docker-compose-ex2.yaml up --build

*   In a second terminal window, invoke the API server:

        curl -X POST http://localhost/content

    In the first terminal windows (where Docker Compose is running), you should see a log statement from the _TMS content_ service, indicating that service-to-service communication was successful.

*   Ctrl+C to shut down Docker Compose.

To create and deploy the _TMS Content_ service, in the **project root** folder:

*   Create the _TMS Content_ service:

        copilot svc init --name content --svc-type "Backend Service" --dockerfile modules/content/Dockerfile 

*   Open `copilot/content/manifest.yml` and provide an [ECS Service Connect custom alias](https://aws.github.io/copilot-cli/docs/developing/svc-to-svc-communication/#how-do-i-use-service-connect) that is the name of the service (`content`).

*   Deploy the _TMS Content_ service:

        copilot svc deploy --name content

*   Deploy the _TMS API_ and its changes:

        copilot svc deploy --name api

*   Invoke your updated API server (replace `AWS_URL` with your Load Balanced Web Service URL):

        curl -X POST http://<AWS_URL>/content

    > Tip: To get info about a service, run `copilot svc show`.

*   Check the logs of the _TMS Content_ service to see that it's handled a request from _TMS API_:

        copilot svc logs --name content
