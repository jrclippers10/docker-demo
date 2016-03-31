# docker-base-nodejs-alpine

This is a docker base image containing Nodejs, Git, and Bash, based on Alpine

This package contains globally installed grunt and bower.

Available tags: ````1.0.0, latest````

````
docker pull myvbo/alpine_node
````

Sample use

````
// Dockerfile
FROM myvbo/alpine_node:1.0.0
COPY . /app
CMD npm start
````

### Development
After altering this image, be sure to update the VERSION tag in the Makefile. You can then run:

````
$ make build
$ make release
````

This will create a build with the tag specified in VERSION, and push that image to dockerhub


