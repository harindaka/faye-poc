# faye-poc
A POC done to understand Faye Server and Client behaviour

How to Run the project:

You will need to have the following installed globally and available in your PATH
1. NodeJS (node)
2. Angular CLI (ng)
3. Redis Server on localhost:6379 (redis)
4. Nginx Web Server (nginx). Note that nginx will need to use the included nginx/nginx.conf configuration. The `run-nginx` scripts mentioned below will automatically take care of this. The nginx.conf is configured to make nginx proxy the faye server on port 3443 via SSL.

Follow the steps below to run the project manually.

1. Clone this repository into a folder and `cd` into it
2. Run your Redis server with the command `run-redis.bat` (windows) or `./run-redis` (*nix/mac)
3. Run your nginx server with the command `run-nginx.bat` (windows) or `./run-nginx` (*nix/mac)
3. `cd` into the server directory
4. Execute the command `npm install` to install dependencies
5. Execute the command `npm start` to run the server on port 3000
6. `cd` into the client-angular directory
7. Execute the command `npm install` to install dependencies
8. Execute the command `npm start` to start the server on port 4200
9. Access the web client using a web browser via http://localhost:4200 

For a load balanced setup follow the steps below;

1. In the nginx/nginx.conf add one or more server entries in the upstream faye_server section
i.e.: 
`upstream faye_server {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}`

2. Spin up multiple processes of the server via `npm start` on the ports configured during the previous step. Note that the port can be changed in the server/src/config.js file.
3. Start the nginx server with the command `run-nginx.bat` (windows) or `./run-nginx` (*nix/mac)
4. Access the web client using a web browser via http://localhost:4200