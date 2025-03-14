# Builder stage
FROM node:18-alpine AS builder
WORKDIR /app

# Define build arguments for sensitive information
ARG MONGODB_URI

# Install dependencies
COPY package*.json ./ 
RUN npm ci

# Copy the entire source code (including client-admin and chatbot)
COPY ./src ./src

# Copy rollup tsconfig tailwind config
COPY rollup.config.js tsconfig.json tailwind.config.js postcss.config.js ./ 

# Set Node.js memory limit for the build process (e.g., 4GB)
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Step 1: Build the server (Rollup)
RUN npm run build:server

# Step 2: Build the client-admin (Next.js app)
RUN npm run build:client-admin


# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Set environment variable from ARG
ARG MONGODB_URI
ENV MONGODB_URI=$MONGODB_URI

# Copy Next.js built files (client-admin)
COPY --from=builder /app/src/client-admin/.next ./src/client-admin/.next

# Copy backend build files (dist)
COPY --from=builder /app/dist ./dist

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./ 

# Copy environment files
COPY --from=builder /app/src/chatbot/prompts ./src/chatbot/prompts

# Copy the public directory for static assets (images, etc.)
COPY --from=builder /app/src/client-admin/public ./src/client-admin/public

# Expose the port your app runs on
EXPOSE 3000

# Start the application (backend)
CMD ["npm", "start"]
