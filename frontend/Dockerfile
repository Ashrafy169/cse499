# Use the official Node.js LTS image as the base
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker's caching mechanism
COPY package.json package-lock.json ./

# Install dependencies in a clean, reproducible way
RUN npm ci

# Copy the rest of the frontend source code
COPY . .

# Next.js statically bakes in NEXT_PUBLIC_ environment variables at build time.
# We define an ARG so the backend API URL can be passed during the image build.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the Next.js project
RUN npm run build

# Set the node environment to production
ENV NODE_ENV=production

# Expose port 3000 for the Next.js server
EXPOSE 3000

# Start the Next.js production server
CMD ["npm", "run", "start"]
