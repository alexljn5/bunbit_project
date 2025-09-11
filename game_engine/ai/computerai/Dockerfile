# Use lightweight Nginx image
FROM nginx:alpine

# Copy all game files to Nginx's web root
COPY . /usr/share/nginx/html

# Expose port 80 for web access
EXPOSE 80

# Nginx starts automatically, no CMD needed