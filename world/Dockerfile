FROM node:4.4.1
RUN mkdir /app
WORKDIR /app
ADD . /app/
RUN npm install
EXPOSE 5000
CMD ["node", "app.js"]