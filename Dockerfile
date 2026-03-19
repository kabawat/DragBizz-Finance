FROM node:22

# Set working directory to /app (matching docker-compose volumes)
WORKDIR /app

# Copy only package.json and yarn.lock for caching
COPY package.json yarn.lock* ./

RUN yarn install

# Copy rest of the project
COPY . .

# Expose REST app port and gRPC port
EXPOSE 3000 50052

CMD ["yarn", "dev"]