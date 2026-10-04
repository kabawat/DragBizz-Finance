FROM node:22

# Set working directory to /app (matching docker-compose volumes)
WORKDIR /app

# Copy only package.json, lockfile, and Yarn config for caching
COPY package.json yarn.lock* .yarnrc.yml ./

# node:22 ships Yarn 1, which cannot use these Yarn 4 lockfiles
RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg \
  && corepack enable \
  && corepack prepare yarn@4.14.1 --activate \
  && yarn install

# Copy rest of the project
COPY . .

# Expose REST app port (3000→4002 on host) and gRPC port (50052→8002 on host)
EXPOSE 3000 50052

CMD ["yarn", "start"]