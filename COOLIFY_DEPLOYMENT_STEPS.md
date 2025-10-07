# 🚀 Coolify Deployment - Step by Step

## Option 1: Docker Deployment (Recommended)

### Step 1: Access Coolify
- Go to your VPS IP: `http://your-vps-ip:8000`
- Or your domain: `https://coolify.yourdomain.com`

### Step 2: Create New Application
1. Click **"New Application"** or **"Create Application"**
2. Look for **"Docker"** or **"Docker Compose"** option
3. Select **"Docker"**

### Step 3: Configure Docker
1. **Repository URL**: `https://github.com/werunwp/rahedeen-wholesale-sync.git`
2. **Branch**: `main`
3. **Dockerfile Path**: `./Dockerfile` (or leave empty if in root)
4. **Port**: `80`

### Step 4: Environment Variables
Add these in the environment variables section:
```
VITE_SUPABASE_URL=YOUR_SUPABASE_URL_HERE
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NODE_ENV=production
```

### Step 5: Deploy
- Click **"Deploy"** or **"Create Application"**
- Coolify will build the Docker image and deploy

---

## Option 2: Static Site Deployment

### Step 1: Create New Application
1. Click **"New Application"**
2. Look for **"Static Site"** or **"Frontend"** option
3. Select it

### Step 2: Configure Build
1. **Repository URL**: `https://github.com/werunwp/rahedeen-wholesale-sync.git`
2. **Branch**: `main`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Node Version**: `18` or `20`

### Step 3: Environment Variables
Same as above

### Step 4: Deploy
- Click **"Deploy"**

---

## Option 3: Manual Upload

If you can't find Git options:

### Step 1: Build Locally
```bash
npm run build
```

### Step 2: Upload to Coolify
1. Create a new application
2. Look for **"Upload"** or **"Manual"** option
3. Upload the `dist` folder contents
4. Set up a web server (Nginx)

---

## Troubleshooting

### If you don't see Git options:
1. **Check Coolify version** - Update if needed
2. **Look for "Source"** or **"Repository"** section
3. **Try "Docker"** option instead
4. **Check if you need to enable Git integration**

### Common Interface Elements:
- **"New Application"** → **"Docker"**
- **"Create Project"** → **"From Git"**
- **"Add Service"** → **"Git Repository"**
- **"Deploy"** → **"Static Site"**

### If you see different options:
1. **Docker Compose** - Use the Dockerfile I created
2. **Node.js** - Use build command: `npm run build`
3. **Nginx** - Upload the `dist` folder

---

## Quick Alternative: Direct VPS Deployment

If Coolify is too complex, you can deploy directly to your VPS:

### Step 1: SSH into your VPS
```bash
ssh root@your-vps-ip
```

### Step 2: Clone and Build
```bash
git clone https://github.com/werunwp/rahedeen-wholesale-sync.git
cd rahedeen-wholesale-sync
npm install
npm run build
```

### Step 3: Set up Nginx
```bash
# Install Nginx
apt update && apt install nginx -y

# Copy files
cp -r dist/* /var/www/html/

# Configure Nginx
nano /etc/nginx/sites-available/default
```

### Step 4: Start Services
```bash
systemctl start nginx
systemctl enable nginx
```

---

## Need Help?

**Can you tell me:**
1. What options do you see when you click "New Application"?
2. What version of Coolify are you using?
3. Are you using Coolify Cloud or self-hosted?

**I'll help you find the right option!** 🎯
