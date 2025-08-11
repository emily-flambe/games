# 📁 Project Documentation

**This directory contains critical project-specific documentation that every developer MUST read.**

---

## 🚨 **START HERE - CRITICAL FILES**

### **[CRITICAL-DEPLOYMENT-RULES.md](CRITICAL-DEPLOYMENT-RULES.md)**
**⚡ MUST READ BEFORE ANY COMMIT**

- Explains automated versioning system
- Required commit message formats
- What triggers deployments vs safe changes
- Emergency procedures

### **[DEVELOPMENT-WORKFLOW.md](DEVELOPMENT-WORKFLOW.md)**  
**📋 Development best practices**

- Step-by-step development flow
- Commit message patterns for games
- Pre-commit checklist
- Version planning guidance

### **[PROJECT-OVERVIEW.md](PROJECT-OVERVIEW.md)**
**📖 Complete project reference**

- Architecture overview
- Key files and their purposes
- Quick start guide
- Environment details

---

## 🎯 **File Purpose Summary**

| File | Purpose | When to Read |
|------|---------|--------------|
| `CRITICAL-DEPLOYMENT-RULES.md` | **Deployment system** | **Before ANY commit** |
| `DEVELOPMENT-WORKFLOW.md` | **Development practices** | **When starting development** |
| `PROJECT-OVERVIEW.md` | **Project reference** | **For project understanding** |

---

## 🚀 **Quick Actions**

```bash
# First time setup - CRITICAL
npm run setup-hooks

# Check what version bump your commits would trigger
npx semantic-release --dry-run

# Start development
npm run dev
```

---

**⚡ Remember: This project uses automated deployments - your commit messages control production!**