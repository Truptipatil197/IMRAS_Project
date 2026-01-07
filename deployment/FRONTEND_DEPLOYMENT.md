# IMRAS Frontend Deployment Guide

## Table of Contents
1. [Frontend Deployment](#6-frontend-deployment)
   - [6.1 Frontend File Structure](#61-frontend-file-structure)
   - [6.2 Update API Configuration](#62-update-api-configuration)
   - [6.3 Static File Optimization](#63-static-file-optimization)
2. [Web Server Configuration](#7-web-server-configuration)
   - [7.1 Nginx Installation](#71-nginx-installation)
   - [7.2 Nginx Configuration for IMRAS](#72-nginx-configuration-for-imras)
   - [7.3 Alternative: Apache Configuration](#73-alternative-apache-configuration)
3. [SSL/TLS Configuration](#8-ssltls-configuration)
   - [8.1 Obtain SSL Certificate (Let's Encrypt)](#81-obtain-ssl-certificate-lets-encrypt)
   - [8.2 SSL Configuration Best Practices](#82-ssl-configuration-best-practices)

---

## 6. Frontend Deployment

### 6.1 Frontend File Structure

```bash
# Create web root directory
sudo mkdir -p /var/www/imras
sudo chown -R www-data:www-data /var/www/imras

# Copy frontend files
sudo cp -r /opt/imras/app/frontend/* /var/www/imras/

# Set permissions
sudo chmod -R 755 /var/www/imras
```

### 6.2 Update API Configuration

Edit frontend API configuration:
```bash
sudo nano /var/www/imras/js/config.js
```

Update API base URL:
```javascript
const CONFIG = {
    API_BASE_URL: 'https://yourdomain.com',  // Change from localhost
    ENDPOINTS: {
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout',
        // ... rest remains same
    },
    // ... rest of config
};
```

### 6.3 Static File Optimization

**Minify JavaScript (Optional):**
```bash
# Install terser
sudo npm install -g terser

# Minify JS files
cd /var/www/imras/js
for file in *.js; do
    terser "$file" --compress --mangle -o "${file%.js}.min.js"
done
```

**Minify CSS (Optional):**
```bash
# Install clean-css-cli
sudo npm install -g clean-css-cli

# Minify CSS files
cd /var/www/imras/css
for file in *.css; do
    cleancss "$file" -o "${file%.css}.min.css"
done
```

**Update HTML to use minified files** (if you minified):
```html
<!-- Before -->
<script src="js/dashboard.js"></script>

<!-- After -->
<script src="js/dashboard.min.js"></script>
```

---

## 7. Web Server Configuration

### 7.1 Nginx Installation
```bash
# Install Nginx
sudo apt install nginx -y

# Start and enable
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### 7.2 Nginx Configuration for IMRAS

**Create Nginx Config File:**
```bash
sudo nano /etc/nginx/sites-available/imras
```

```nginx
# IMRAS Nginx Configuration

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Let's Encrypt verification
    location /.well-known/acert-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Certificate (will be configured after obtaining cert)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Logging
    access_log /var/log/nginx/imras-access.log;
    error_log /var/log/nginx/imras-error.log;
    
    # Root directory for frontend
    root /var/www/imras;
    index index.html;
    
    # Serve frontend static files
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
    
    # File upload size limit
    client_max_body_size 10M;
}
```

**Enable Site:**
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/imras /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# If test successful, reload
sudo systemctl reload nginx
```

### 7.3 Alternative: Apache Configuration

If using Apache instead of Nginx:
```bash
# Install Apache
sudo apt install apache2 -y

# Enable required modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod ssl
sudo a2enmod headers
```

**Create Apache Config:**
```bash
sudo nano /etc/apache2/sites-available/imras.conf
```

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    
    # Redirect to HTTPS
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem
    
    # Document Root
    DocumentRoot /var/www/imras
    
    <Directory /var/www/imras>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # Proxy API requests to Node.js
    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api
    
    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/imras-error.log
    CustomLog ${APACHE_LOG_DIR}/imras-access.log combined
</VirtualHost>
```

**Enable site:**
```bash
sudo a2ensite imras
sudo systemctl reload apache2
```

---

## 8. SSL/TLS Configuration

### 8.1 Obtain SSL Certificate (Let's Encrypt)

**Install Certbot:**
```bash
# Install certbot and nginx plugin
sudo apt install certbot python3-certbot-nginx -y
```

**Obtain Certificate:**
```bash
# For Nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# For Apache
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (choose Yes)
```

**Auto-Renewal:**
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up renewal cron job
# Check:
sudo systemctl status certbot.timer

# Manual renewal (if needed)
sudo certbot renew
```

### 8.2 SSL Configuration Best Practices

**Generate Strong DH Parameters:**
```bash
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 4096
```

Add to Nginx config (inside server block):
```nginx
ssl_dhparam /etc/ssl/certs/dhparam.pem;
```

**Test SSL Configuration:**

Visit: [SSL Labs Test](https://www.ssllabs.com/ssltest/)
Enter your domain and check for A+ rating.

---

## Next Steps

1. [Backend Deployment Guide](../deployment/BACKEND_DEPLOYMENT.md)
2. [Complete Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)
3. [User Manual](../IMRAS_User_Manual.md)
