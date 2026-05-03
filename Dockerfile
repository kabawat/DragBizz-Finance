FROM node:22

# Set working directory to /app (matching docker-compose volumes)
WORKDIR /app

# Copy only package.json and yarn.lock for caching
COPY package.json yarn.lock* ./

RUN yarn install --frozen-lockfile

# Copy rest of the project
COPY . .

# Expose REST app port (3000→4002 on host) and gRPC port (50052→8002 on host)
EXPOSE 3000 50052

CMD ["yarn", "start"]