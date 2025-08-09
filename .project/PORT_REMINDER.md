# 🚨 CRITICAL PORT CONFIGURATION 🚨

## **DEVELOPMENT PORT: 8777**

### **ABSOLUTE RULE:**
- **ALWAYS** use port 8777 for development
- **NEVER** change to any other port (8778, 3000, etc.)
- The project is specifically configured for port 8777

### **Commands that MUST use 8777:**
- `npm run dev` (configured to use 8777)
- `wrangler dev --port 8777`
- Any manual wrangler commands

### **If port 8777 is in use:**
```bash
# Kill existing processes on port 8777
lsof -ti:8777 | xargs kill -9

# Then start normally
npm run dev
```

### **Project Configuration:**
- package.json dev script uses --port 8777
- .project/settings.json specifies port 8777
- All documentation assumes port 8777

## **REMEMBER: 8777 IS THE ONLY ACCEPTABLE PORT**