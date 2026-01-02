# Local Development Guide

## Dev Server Scripts

| Script | Use Case |
|--------|----------|
| `npm run dev` | Standard Next.js dev server (default) |
| `npm run dev:stable` | Polling watchers - fixes "running but won't load" on macOS |
| `npm run dev:wsl` | Polling + bind to all interfaces - for WSL development |
| `npm run dev:clean` | Clear `.next` cache and start fresh |
| `npm run dev:reset` | Nuclear option: kill ports, clear cache, start with polling |

## Troubleshooting

### "Server says running but app won't load"

This is usually caused by file watcher issues. Try these in order:

1. **macOS**: Use polling watchers
   ```bash
   npm run dev:stable
   ```

2. **WSL**: Use WSL-specific script (binds to 0.0.0.0)
   ```bash
   npm run dev:wsl
   ```

3. **Nuclear option**: Full reset
   ```bash
   npm run dev:reset
   ```

### localhost vs 127.0.0.1

If `http://localhost:3000` fails but `http://127.0.0.1:3000` works:
- This is a DNS resolution issue on your machine
- Use `127.0.0.1:3000` directly
- Or add `127.0.0.1 localhost` to your hosts file

### WSL Best Practices

For best file watcher performance in WSL:

1. **Store the repo inside WSL filesystem** (not `/mnt/c/...`)
   ```bash
   # Good - native WSL filesystem
   /home/youruser/projects/belt-conveyor

   # Bad - Windows filesystem via mount (slow watchers)
   /mnt/c/Users/youruser/projects/belt-conveyor
   ```

2. **Always use `dev:wsl` script** - it binds to `0.0.0.0` so Windows browsers can connect

3. **Access from Windows browser** at `http://localhost:3000` or `http://127.0.0.1:3000`

### Port Already in Use

If you see "Port 3000 is in use":

```bash
# Quick fix - use dev:reset
npm run dev:reset

# Manual fix - kill specific port
npx kill-port 3000
```

## Environment Variables for Watchers

The `dev:stable` and `dev:wsl` scripts set these environment variables:

- `WATCHPACK_POLLING=true` - Webpack 5 file watcher polling
- `CHOKIDAR_USEPOLLING=1` - Chokidar (used by Next.js) polling mode

These enable polling-based file watching which is slower but more reliable across different filesystems and virtualization layers.
