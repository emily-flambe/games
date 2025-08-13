# Versioning Convention

## Simple Patch-Bump Strategy

### Rules
1. **Every branch bumps patch version** - Each branch increments the patch number
2. **No suffixes** - No -alpha, -beta, -rc conventions  
3. **Reset patch on minor/major** - When minor or major version changes, patch resets to 0

### Examples
```
Current: 1.1.1
Branch work: 1.1.2, 1.1.3, 1.1.4...

Minor release: 1.2.0 (patch resets)
Branch work: 1.2.1, 1.2.2, 1.2.3...

Major release: 2.0.0 (patch resets)
Branch work: 2.0.1, 2.0.2, 2.0.3...
```

### Implementation
- **Manual bumping**: Edit `package.json` version field
- **Automated option**: Use `npm run bump-patch` script
- **No semantic analysis** - Just increment patch for all changes

### Benefits
- **Simple and predictable** - No complex rules to remember
- **Clear progression** - Easy to see development activity
- **No confusion** - No suffix conventions to decode
- **Git-friendly** - Each commit can have unique version

### When to Bump Minor/Major
- **Minor (1.1.0 → 1.2.0)**: New game added, significant feature
- **Major (1.0.0 → 2.0.0)**: Breaking changes, architecture overhaul
- **Patch (1.1.1 → 1.1.2)**: Everything else (fixes, tweaks, cleanup)

This convention prioritizes simplicity over semantic precision.