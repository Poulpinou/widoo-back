FROM node:17

# Create workdir
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Server
EXPOSE 8080
CMD [ "node", "app.js" ]