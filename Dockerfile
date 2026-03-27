# 1. Node version 22 (Latest and fast)
FROM node:22

# 2. App directory set karna
WORKDIR /app

# 3. Dependencies copy aur install karna
COPY package.json ./
RUN npm install

# 4. Saari files copy karna (Ismein auth.js, script.js sab aa jayengi)
COPY . .

# 5. 🚀 PORT FIX: Koyeb hamesha port 8000 ya 3000 mangta hai, 
# par tumhare server.js mein port 3000 hai, isliye ise fix karein.
EXPOSE 3000

# 6. App start karne ki command
CMD ["npm", "start"]
