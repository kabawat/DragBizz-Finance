FROM node:22

WORKDIR /app

COPY package.json yarn.lock* .yarnrc.yml ./

# Use Yarn 4 for the repository lockfile.
RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg \
  && corepack enable \
  && corepack prepare yarn@4.14.1 --activate \
  && yarn install

COPY . .

EXPOSE 3000 50052

CMD ["yarn", "start"]